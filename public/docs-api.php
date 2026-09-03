<?php
/* Contratá Ya — API del vault de Documentos (sólo admin).
   Hostinger no corre Express: esta es la puerta de producción. */
header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-store');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
  http_response_code(204);
  exit;
}

function docs_json($data, $code = 200) {
  http_response_code($code);
  header('Content-Type: application/json; charset=utf-8');
  echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
  exit;
}

function bearer() {
  $h = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';
  if ($h === '' && function_exists('apache_request_headers')) {
    foreach (apache_request_headers() as $k => $v) {
      if (strtolower($k) === 'authorization') { $h = $v; break; }
    }
  }
  if (stripos($h, 'Bearer ') === 0) return substr($h, 7);
  return '';
}

$cfg = @include __DIR__ . '/mcp-config.php';
$SB_URL = (is_array($cfg) && !empty($cfg['supabase_url']))
  ? rtrim((string) $cfg['supabase_url'], '/')
  : 'https://cehyemmwhcthijzuatmz.supabase.co';
$SB_KEY = 'sb_publishable_Qn57IXRAcSGkzMQvGDyIbw_IvsDm5Ac';

function soy_admin($token) {
  global $SB_URL, $SB_KEY;
  if ($token === '') return false;
  $payload = '{}';
  $url = $SB_URL . '/rest/v1/rpc/soy_admin';
  $headers = [
    'apikey: ' . $SB_KEY,
    'Authorization: Bearer ' . $token,
    'Content-Type: application/json',
    'Content-Length: ' . strlen($payload)
  ];
  if (function_exists('curl_init')) {
    $ch = curl_init($url);
    curl_setopt_array($ch, [
      CURLOPT_POST => true,
      CURLOPT_HTTPHEADER => $headers,
      CURLOPT_POSTFIELDS => $payload,
      CURLOPT_RETURNTRANSFER => true,
      CURLOPT_TIMEOUT => 12
    ]);
    $raw = curl_exec($ch);
    $code = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
  } else {
    $ctx = stream_context_create([
      'http' => [
        'method' => 'POST',
        'header' => implode("\r\n", $headers),
        'content' => $payload,
        'timeout' => 12,
        'ignore_errors' => true
      ]
    ]);
    $raw = @file_get_contents($url, false, $ctx);
    $code = 0;
    if (isset($http_response_header[0]) && preg_match('/\s(\d{3})\s/', $http_response_header[0], $m)) {
      $code = (int) $m[1];
    }
  }
  if ($code < 200 || $code >= 300 || $raw === false) return false;
  $es = json_decode($raw, true);
  return soy_admin_valor($es);
}

function soy_admin_valor($es) {
  if ($es === true || $es === 'true' || $es === 't' || $es === 1) return true;
  if (is_array($es)) {
    if (array_key_exists(0, $es)) return soy_admin_valor($es[0]);
    return !empty($es['soy_admin']) || !empty($es['es_admin']);
  }
  return false;
}

$token = bearer();
if (!soy_admin($token)) {
  docs_json(['error' => 'no autorizado'], 401);
}

const VAULT_MAX_PROF = 5;
const VAULT_MAX_BYTES = 1000000;

$vaultDir = __DIR__ . DIRECTORY_SEPARATOR . 'vault';
if (!is_dir($vaultDir)) @mkdir($vaultDir, 0750, true);
$VAULT_ROOT = realpath($vaultDir);
if ($VAULT_ROOT === false) docs_json(['error' => 'vault no disponible'], 500);

function nombre_ok($n) {
  return (bool) preg_match('/^[A-Za-z0-9À-ÿ _.-]{1,80}$/u', $n);
}

function vault_abs($rel, $folder = false) {
  global $VAULT_ROOT;
  $rel = str_replace('\\', '/', (string) $rel);
  $rel = trim($rel, '/');
  if ($rel === '') return $folder ? $VAULT_ROOT : null;
  if (preg_match('#^[a-zA-Z]:#', $rel) || $rel[0] === '/') return null;
  $partes = explode('/', $rel);
  foreach ($partes as $p) {
    if ($p === '' || trim($p) === '' || $p === '.' || $p === '..' || $p[0] === '.') return null;
  }
  $prof = $folder ? count($partes) : count($partes) - 1;
  if ($prof > VAULT_MAX_PROF) return null;
  $n = count($partes);
  for ($i = 0; $i < $n; $i++) {
    $p = $partes[$i];
    $ultimo = ($i === $n - 1);
    if ($folder || !$ultimo) {
      if (!nombre_ok($p)) return null;
    } else {
      if (!preg_match('/\.md$/i', $p)) return null;
      $base = preg_replace('/\.md$/i', '', $p);
      if (!nombre_ok($base)) return null;
    }
  }
  $abs = $VAULT_ROOT . DIRECTORY_SEPARATOR . implode(DIRECTORY_SEPARATOR, $partes);
  $parent = dirname($abs);
  $realParent = realpath($parent);
  if ($realParent === false) {
    $cursor = $VAULT_ROOT;
    $dirs = $folder ? $partes : array_slice($partes, 0, -1);
    foreach ($dirs as $d) {
      $try = $cursor . DIRECTORY_SEPARATOR . $d;
      $r = realpath($try);
      if ($r !== false) {
        if (strpos($r, $VAULT_ROOT) !== 0) return null;
        $cursor = $r;
        continue;
      }
      if (!nombre_ok($d)) return null;
      $cursor = $try;
    }
    return $folder ? $cursor : ($cursor . DIRECTORY_SEPARATOR . $partes[$n - 1]);
  }
  if ($realParent !== $VAULT_ROOT && strpos($realParent, $VAULT_ROOT . DIRECTORY_SEPARATOR) !== 0) return null;
  return $realParent . DIRECTORY_SEPARATOR . basename($abs);
}

function arbol_vault($dir, $rel = '') {
  $items = [];
  $entradas = @scandir($dir);
  if (!$entradas) return $items;
  foreach ($entradas as $n) {
    if ($n === '.' || $n === '..' || $n[0] === '.') continue;
    if (strtolower($n) === '.htaccess') continue;
    $r = $rel === '' ? $n : ($rel . '/' . $n);
    $abs = $dir . DIRECTORY_SEPARATOR . $n;
    if (is_dir($abs)) {
      $items[] = ['type' => 'dir', 'name' => $n, 'path' => $r, 'children' => arbol_vault($abs, $r)];
    } elseif (preg_match('/\.md$/i', $n)) {
      $items[] = [
        'type' => 'file',
        'name' => preg_replace('/\.md$/i', '', $n),
        'file' => $n,
        'path' => $r
      ];
    }
  }
  usort($items, function ($a, $b) {
    if ($a['type'] !== $b['type']) return $a['type'] === 'dir' ? -1 : 1;
    return strcasecmp($a['name'], $b['name']);
  });
  return $items;
}

function body_json() {
  $raw = file_get_contents('php://input');
  if ($raw === '' || $raw === false) return [];
  $j = json_decode($raw, true);
  return is_array($j) ? $j : [];
}

$recurso = isset($_GET['recurso']) ? (string) $_GET['recurso'] : '';
if ($recurso === '' && preg_match('#/api/admin/docs/([^/?]+)#', $_SERVER['REQUEST_URI'] ?? '', $m)) {
  $recurso = $m[1];
}
$op = isset($_GET['op']) ? (string) $_GET['op'] : '';
$method = $_SERVER['REQUEST_METHOD'];
$body = ($method === 'GET') ? [] : body_json();
$path = isset($_GET['path']) ? (string) $_GET['path'] : (string) ($body['path'] ?? '');

if ($recurso === 'tree' && $method === 'GET') {
  docs_json(['root' => 'vault', 'max' => VAULT_MAX_PROF, 'tree' => arbol_vault($VAULT_ROOT)]);
}

if ($recurso === 'file' && $method === 'GET') {
  $abs = vault_abs($path);
  if (!$abs) docs_json(['error' => 'ruta inválida'], 400);
  if (!is_file($abs)) docs_json(['error' => 'no encontrado'], 404);
  docs_json(['path' => str_replace('\\', '/', $path), 'contenido' => file_get_contents($abs)]);
}

$guardar = ($recurso === 'file' && $method === 'PUT') || ($recurso === 'file' && $method === 'POST' && $op === 'guardar');
if ($guardar) {
  $abs = vault_abs($path);
  if (!$abs) docs_json(['error' => 'ruta inválida'], 400);
  $contenido = (string) ($body['contenido'] ?? '');
  if (strlen($contenido) > VAULT_MAX_BYTES) docs_json(['error' => 'el archivo supera 1 MB'], 413);
  $dir = dirname($abs);
  if (!is_dir($dir) && !@mkdir($dir, 0750, true)) docs_json(['error' => 'no se pudo crear la carpeta'], 500);
  if (file_put_contents($abs, $contenido) === false) docs_json(['error' => 'no se pudo guardar'], 500);
  docs_json(['ok' => true, 'path' => $path]);
}

$crear = ($recurso === 'file' && $method === 'POST' && $op !== 'guardar' && $op !== 'borrar');
if ($crear) {
  $abs = vault_abs($path);
  if (!$abs) docs_json(['error' => 'ruta inválida'], 400);
  if (is_file($abs)) docs_json(['error' => 'ya existe'], 409);
  $dir = dirname($abs);
  if (!is_dir($dir) && !@mkdir($dir, 0750, true)) docs_json(['error' => 'no se pudo crear la carpeta'], 500);
  $titulo = preg_replace('/\.md$/i', '', basename($abs));
  $semilla = array_key_exists('contenido', $body) ? (string) $body['contenido'] : ("# " . $titulo . "\n\n");
  if (strlen($semilla) > VAULT_MAX_BYTES) docs_json(['error' => 'el archivo supera 1 MB'], 413);
  if (file_put_contents($abs, $semilla) === false) docs_json(['error' => 'no se pudo crear'], 500);
  docs_json(['ok' => true, 'path' => $path]);
}

if ($recurso === 'folder' && $method === 'POST') {
  $abs = vault_abs($path, true);
  if (!$abs) docs_json(['error' => 'ruta inválida o más de 5 carpetas'], 400);
  if (!is_dir($abs) && !@mkdir($abs, 0750, true)) docs_json(['error' => 'no se pudo crear la carpeta'], 500);
  docs_json(['ok' => true, 'path' => $path]);
}

$borrar = ($recurso === 'file' && ($method === 'DELETE' || ($method === 'POST' && $op === 'borrar')));
if ($borrar) {
  $abs = vault_abs($path);
  if (!$abs) docs_json(['error' => 'ruta inválida'], 400);
  if (!is_file($abs)) docs_json(['error' => 'no encontrado'], 404);
  if (!@unlink($abs)) docs_json(['error' => 'no se pudo borrar'], 500);
  docs_json(['ok' => true]);
}

$borrarDir = ($recurso === 'folder' && ($method === 'DELETE' || ($method === 'POST' && $op === 'borrar')));
if ($borrarDir) {
  $abs = vault_abs($path, true);
  if (!$abs) docs_json(['error' => 'ruta inválida'], 400);
  if ($abs === $VAULT_ROOT) docs_json(['error' => 'no se puede borrar la raíz'], 400);
  if (!is_dir($abs)) docs_json(['error' => 'no encontrado'], 404);
  $resto = array_values(array_filter(scandir($abs), function ($n) {
    return $n !== '.' && $n !== '..' && strtolower($n) !== '.htaccess';
  }));
  if (count($resto)) docs_json(['error' => 'la carpeta no está vacía'], 409);
  if (!@rmdir($abs)) docs_json(['error' => 'no se pudo borrar'], 500);
  docs_json(['ok' => true]);
}

docs_json(['error' => 'ruta no reconocida'], 404);
