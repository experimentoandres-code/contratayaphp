<?php
/* Contratá Ya — MCP 24/7 en Hostinger. Grok pega acá, la PC puede estar apagada. */
header('X-Content-Type-Options: nosniff');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Content-Type, Authorization, MCP-Session-Id, MCP-Protocol-Version');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS, DELETE');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
  http_response_code(204);
  exit;
}

$cfg = @include __DIR__ . '/mcp-config.php';
if (!is_array($cfg)) $cfg = ['token' => 'contrataya-grok-2026'];
$TOKEN = (string) ($cfg['token'] ?? '');

function mcp_json($data, $code = 200) {
  http_response_code($code);
  header('Content-Type: application/json; charset=utf-8');
  echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
  exit;
}

function autorizado($token) {
  if ($token === '') return true;
  $h = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';
  if (stripos($h, 'Bearer ') === 0 && substr($h, 7) === $token) return true;
  if (!empty($_GET['token']) && hash_equals($token, (string) $_GET['token'])) return true;
  return false;
}

if (!autorizado($TOKEN)) {
  mcp_json(['error' => 'no autorizado'], 401);
}

if ($_SERVER['REQUEST_METHOD'] === 'GET' && (isset($_GET['salud']) || preg_match('#/salud$#', $_SERVER['REQUEST_URI'] ?? ''))) {
  mcp_json(['ok' => true, 'donde' => 'hostinger', 'tools' => 7]);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
  http_response_code(405);
  header('Allow: POST, OPTIONS');
  exit;
}

$raw = file_get_contents('php://input');
$msg = json_decode($raw, true);
if (!is_array($msg)) mcp_json(['jsonrpc' => '2.0', 'id' => null, 'error' => ['code' => -32700, 'message' => 'JSON inválido']]);

$ROOT = realpath(__DIR__);
$BLOQUEADOS = ['mcp.php', 'mcp-config.php', '.htaccess'];
$EXT_OK = ['html', 'css', 'js', 'webmanifest', 'svg', 'json', 'txt', 'md'];

function rel_ok($rel) {
  global $ROOT, $BLOQUEADOS, $EXT_OK;
  $rel = str_replace('\\', '/', (string) $rel);
  $rel = ltrim($rel, '/');
  if ($rel === '' || strpos($rel, '..') !== false) return null;
  $base = strtolower(basename($rel));
  if (in_array($base, $BLOQUEADOS, true)) return null;
  $ext = strtolower(pathinfo($rel, PATHINFO_EXTENSION));
  if (!in_array($ext, $EXT_OK, true)) return null;
  $abs = realpath($ROOT . '/' . $rel);
  if ($abs === false) {
    $abs_try = $ROOT . '/' . $rel;
    $dir = realpath(dirname($abs_try));
    if ($dir === false || strpos($dir, $ROOT) !== 0) return null;
    return ['rel' => $rel, 'abs' => $abs_try, 'existe' => false];
  }
  if (strpos($abs, $ROOT) !== 0) return null;
  return ['rel' => $rel, 'abs' => $abs, 'existe' => true];
}

function listar($dir, $pref = '') {
  $out = [];
  $dh = @scandir($dir);
  if (!$dh) return $out;
  foreach ($dh as $n) {
    if ($n === '.' || $n === '..' || $n[0] === '.') continue;
    if (in_array(strtolower($n), ['mcp.php', 'mcp-config.php'], true)) continue;
    $rel = $pref ? "$pref/$n" : $n;
    $p = $dir . DIRECTORY_SEPARATOR . $n;
    if (is_dir($p)) $out = array_merge($out, listar($p, $rel));
    else $out[] = str_replace('\\', '/', $rel);
  }
  sort($out);
  return $out;
}

function bump_cache() {
  global $ROOT;
  $sw = $ROOT . '/sw.js';
  $txt = file_get_contents($sw);
  if (!preg_match('/contrataya-v(\d+)/', $txt, $m)) throw new Exception('no hay versión en sw.js');
  $n = ((int) $m[1]) + 1;
  $txt = preg_replace('/contrataya-v\d+/', 'contrataya-v' . $n, $txt);
  file_put_contents($sw, $txt);
  foreach (['app.html', 'index.html'] as $f) {
    $p = $ROOT . '/' . $f;
    if (!is_file($p)) continue;
    $h = file_get_contents($p);
    $h = preg_replace('#(/js/(?:app|data)\.js)\?v=\d+#', '${1}?v=' . $n, $h);
    $h = preg_replace('#(/css/landing\.css)\?v=\d+#', '${1}?v=' . $n, $h);
    file_put_contents($p, $h);
  }
  return $n;
}

$TOOLS = [
  ['name' => 'listar_web', 'description' => 'Lista archivos de contrataya.pro (html, css, js).', 'inputSchema' => ['type' => 'object', 'properties' => ['carpeta' => ['type' => 'string']]]],
  ['name' => 'leer_web', 'description' => 'Lee un archivo. Ruta tipo index.html, css/landing.css, js/app.js.', 'inputSchema' => ['type' => 'object', 'properties' => ['ruta' => ['type' => 'string'], 'desde_linea' => ['type' => 'number'], 'lineas' => ['type' => 'number']], 'required' => ['ruta']]],
  ['name' => 'escribir_web', 'description' => 'Sobrescribe un archivo de la web en Hostinger. El cambio queda online al toque.', 'inputSchema' => ['type' => 'object', 'properties' => ['ruta' => ['type' => 'string'], 'contenido' => ['type' => 'string']], 'required' => ['ruta', 'contenido']]],
  ['name' => 'reemplazar_web', 'description' => 'Reemplaza un texto exacto en un archivo. Si hay más de un match, falla.', 'inputSchema' => ['type' => 'object', 'properties' => ['ruta' => ['type' => 'string'], 'buscar' => ['type' => 'string'], 'poner' => ['type' => 'string']], 'required' => ['ruta', 'buscar', 'poner']]],
  ['name' => 'bump_cache', 'description' => 'Sube la versión del service worker para que el celu vea el cambio.', 'inputSchema' => ['type' => 'object', 'properties' => new stdClass()]],
  ['name' => 'set_whatsapp', 'description' => 'Guarda el WhatsApp 549XXXXXXXXXX en js/data.js.', 'inputSchema' => ['type' => 'object', 'properties' => ['numero' => ['type' => 'string']], 'required' => ['numero']]],
  ['name' => 'publicar_web', 'description' => 'En Hostinger no hace falta: los cambios ya están en el sitio. Esta tool no hace nada y lo dice.', 'inputSchema' => ['type' => 'object', 'properties' => new stdClass()]],
];

function out_text($x) {
  $t = is_string($x) ? $x : json_encode($x, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);
  return ['content' => [['type' => 'text', 'text' => $t]]];
}

function ejecutar($nombre, $args) {
  global $ROOT, $TOOLS;
  $args = is_array($args) ? $args : [];
  switch ($nombre) {
    case 'listar_web':
      $pref = isset($args['carpeta']) ? trim($args['carpeta'], '/') : '';
      $dir = $pref === '' ? $ROOT : $ROOT . '/' . str_replace('..', '', $pref);
      if (!is_dir($dir)) throw new Exception('no existe esa carpeta');
      return listar($dir, $pref);
    case 'leer_web':
      $r = rel_ok($args['ruta'] ?? '');
      if (!$r || !$r['existe']) throw new Exception('archivo no encontrado');
      $lineas = preg_split("/\n/", file_get_contents($r['abs']));
      $desde = max(1, (int) ($args['desde_linea'] ?? 1));
      $cant = min((int) ($args['lineas'] ?? 400), 800);
      $slice = array_slice($lineas, $desde - 1, $cant);
      $txt = '';
      foreach ($slice as $i => $l) $txt .= ($desde + $i) . '|' . $l . "\n";
      return ['ruta' => $r['rel'], 'total_lineas' => count($lineas), 'contenido' => $txt];
    case 'escribir_web':
      $r = rel_ok($args['ruta'] ?? '');
      if (!$r) throw new Exception('ruta no permitida');
      $c = (string) ($args['contenido'] ?? '');
      if (strlen($c) > 2000000) throw new Exception('archivo demasiado grande');
      $dir = dirname($r['abs']);
      if (!is_dir($dir)) mkdir($dir, 0755, true);
      if (file_put_contents($r['abs'], $c) === false) throw new Exception('no se pudo escribir');
      return ['ok' => true, 'ruta' => $r['rel'], 'online' => true];
    case 'reemplazar_web':
      $r = rel_ok($args['ruta'] ?? '');
      if (!$r || !$r['existe']) throw new Exception('archivo no encontrado');
      $buscar = (string) ($args['buscar'] ?? '');
      $poner = (string) ($args['poner'] ?? '');
      if ($buscar === '') throw new Exception('buscar vacío');
      $raw = file_get_contents($r['abs']);
      $n = substr_count($raw, $buscar);
      if ($n === 0) throw new Exception('no se encontró ese texto');
      if ($n > 1) throw new Exception("hay $n coincidencias; hacé el buscar más específico");
      file_put_contents($r['abs'], str_replace($buscar, $poner, $raw));
      return ['ok' => true, 'ruta' => $r['rel'], 'online' => true];
    case 'bump_cache':
      $n = bump_cache();
      return ['version' => 'contrataya-v' . $n];
    case 'set_whatsapp':
      $num = preg_replace('/\D+/', '', (string) ($args['numero'] ?? ''));
      if (strlen($num) < 10) throw new Exception('número corto: usá 549XXXXXXXXXX');
      $p = $ROOT . '/js/data.js';
      $raw = file_get_contents($p);
      if (!preg_match("/const WHATSAPP_CONTRATA = '[^']*'/", $raw)) throw new Exception('no está WHATSAPP_CONTRATA');
      $raw = preg_replace("/const WHATSAPP_CONTRATA = '[^']*'/", "const WHATSAPP_CONTRATA = '" . $num . "'", $raw, 1);
      file_put_contents($p, $raw);
      $n = bump_cache();
      return ['ok' => true, 'numero' => $num, 'version' => 'contrataya-v' . $n];
    case 'publicar_web':
      return ['ok' => true, 'nota' => 'Esto corre en Hostinger: lo que edites ya está en www.contrataya.pro. Pedí bump_cache si el celu no ve el cambio.'];
    default:
      throw new Exception('Tool desconocida: ' . $nombre);
  }
}

function handle($msg) {
  global $TOOLS;
  if (($msg['jsonrpc'] ?? '') !== '2.0') {
    return ['jsonrpc' => '2.0', 'id' => $msg['id'] ?? null, 'error' => ['code' => -32600, 'message' => 'JSON-RPC 2.0']];
  }
  $method = $msg['method'] ?? '';
  $id = $msg['id'] ?? null;
  if (is_string($method) && strpos($method, 'notifications/') === 0) return null;
  if ($method === 'initialize') {
    $ver = $msg['params']['protocolVersion'] ?? '2025-03-26';
    return ['jsonrpc' => '2.0', 'id' => $id, 'result' => [
      'protocolVersion' => $ver,
      'capabilities' => ['tools' => ['listChanged' => false]],
      'serverInfo' => ['name' => 'contrataya-hostinger', 'version' => '1.0.0'],
      'instructions' => 'Conector 24/7 de Contratá Ya en Hostinger. Podés listar, leer, reemplazar y escribir archivos de la web. Los cambios quedan online al toque. bump_cache para el celu. set_whatsapp para el número 549...'
    ]];
  }
  if ($method === 'ping') return ['jsonrpc' => '2.0', 'id' => $id, 'result' => new stdClass()];
  if ($method === 'tools/list') return ['jsonrpc' => '2.0', 'id' => $id, 'result' => ['tools' => $TOOLS]];
  if ($method === 'tools/call') {
    $name = $msg['params']['name'] ?? '';
    $args = $msg['params']['arguments'] ?? [];
    try {
      return ['jsonrpc' => '2.0', 'id' => $id, 'result' => out_text(ejecutar($name, $args))];
    } catch (Exception $e) {
      return ['jsonrpc' => '2.0', 'id' => $id, 'result' => ['content' => [['type' => 'text', 'text' => 'Error: ' . $e->getMessage()]], 'isError' => true]];
    }
  }
  return ['jsonrpc' => '2.0', 'id' => $id, 'error' => ['code' => -32601, 'message' => 'Método no encontrado: ' . $method]];
}

$lote = array_keys($msg) === range(0, count($msg) - 1) && isset($msg[0]);
if ($lote) {
  $out = [];
  foreach ($msg as $m) {
    $r = handle($m);
    if ($r !== null) $out[] = $r;
  }
  mcp_json($out);
}
$r = handle($msg);
mcp_json($r === null ? new stdClass() : $r);
