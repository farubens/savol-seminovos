<?php
define('ABSPATH', __DIR__);
define('HOUR_IN_SECONDS', 3600);
define('SAVOL_DASHBOARD_2FA_ENABLED', getenv('SAVOL_TEST_2FA') === '1');

class WP_User {
    public int $ID = 7;
    public string $user_login;
    public string $display_name;
    public string $user_email;
    public string $user_pass = 'password-hash';
    public string $user_registered = '2026-01-01 00:00:00';
    public array $roles = ['editor'];
    public function __construct(string $login = 'alan') {
        $this->user_login = $login;
        $this->display_name = ucfirst($login);
        $this->user_email = $login . '@savol.com.br';
    }
}

class WP_REST_Request {
    public function __construct(private array $params = [], private array $body = [], private string $authorization = '', private string $method = 'GET') {}
    public function get_param(string $key) { return $this->params[$key] ?? null; }
    public function get_json_params(): array { return $this->body; }
    public function get_header(string $key): string { return $key === 'authorization' ? $this->authorization : ''; }
    public function get_method(): string { return $this->method; }
}

class WP_REST_Response {
    public function __construct(public array $data, public int $status) {}
}

class WP_Error {
    public function __construct(public string $code, public string $message, public array $data) {}
}

$meta = [];
$transients = [];
$last_mail = [];
$current_login = 'alan';
class WPDB_Stub {
    public array $rows = [];
    public string $prefix = 'wp_';
    public function insert(string $table, array $data, array $formats): void { $this->rows[] = $data; }
}
$wpdb = new WPDB_Stub();
function absint($value): int { return abs((int) $value); }
function wp_salt(string $scheme): string { return 'test-secret'; }
function wp_json_encode($value): string { return (string) json_encode($value); }
function get_user_by(string $field, int $id): ?WP_User { global $current_login; return $field === 'id' && $id === 7 ? new WP_User($current_login) : null; }
function get_post_type(int $post_id): string { return $post_id === 42 ? 'veiculo' : 'post'; }
function user_can(WP_User $user, string $capability, ...$args): bool { return false; }
function wp_set_current_user(int $id): void {}
function sanitize_user(string $value): string { return $value; }
function sanitize_email(string $value): string { return filter_var($value, FILTER_VALIDATE_EMAIL) ? $value : ''; }
function sanitize_key(string $value): string { return strtolower(preg_replace('/[^a-z0-9_\-]/i', '', $value)); }
function sanitize_textarea_field(string $value): string { return trim($value); }
function sanitize_text_field(string $value): string { return trim($value); }
function current_time(string $format, bool $gmt = false): string { return '2026-10-02 12:00:00'; }
function get_post_meta(int $post_id, string $key, bool $single = false) { global $meta; return $meta[$post_id][$key] ?? ''; }
function get_post_field(string $field, int $post_id): string { return ''; }
function get_the_title(int $post_id): string { return 'Veiculo teste'; }
function wp_get_object_terms(int $post_id, string $taxonomy, array $args = []): array { return []; }
function is_wp_error($value): bool { return $value instanceof WP_Error; }
if (!function_exists('mb_strlen')) {
    function mb_strlen(string $value): int { return strlen($value); }
}
if (!function_exists('mb_substr')) {
    function mb_substr(string $value, int $start, ?int $length = null): string { return substr($value, $start, $length); }
}
function update_post_meta(int $post_id, string $key, string $value): void {
    global $meta;
    $meta[$post_id][$key] = $value;
}

require dirname(__DIR__) . '/modules/vehicles/class-savol-veiculos-cpt.php';

$marker = hash_hmac('sha256', 'password-hash', wp_salt('auth'));
$payload = rtrim(strtr(base64_encode(json_encode(['user_id' => 7, 'expires_at' => time() + 3600, 'auth_marker' => $marker])), '+/', '-_'), '=');
$token = $payload . '.' . hash_hmac('sha256', $payload, wp_salt('auth'));
$request = static fn(array $body = [], string $method = 'GET') => new WP_REST_Request(['id' => 42], $body, 'Bearer ' . $token, $method);

$anonymous_data = Savol_Veiculos_CPT::dashboard_can_view_data(new WP_REST_Request());
if (!$anonymous_data instanceof WP_Error || $anonymous_data->data['status'] !== 403) throw new RuntimeException('Dashboard data is public');
$legacy_payload = rtrim(strtr(base64_encode(json_encode(['user_id' => 7, 'expires_at' => time() + 3600])), '+/', '-_'), '=');
$legacy_token = $legacy_payload . '.' . hash_hmac('sha256', $legacy_payload, wp_salt('auth'));
$legacy_session = Savol_Veiculos_CPT::handle_dashboard_session_request(new WP_REST_Request([], [], 'Bearer ' . $legacy_token));
if (!$legacy_session instanceof WP_Error || $legacy_session->data['status'] !== 401) throw new RuntimeException('Legacy session was not invalidated');

$session = Savol_Veiculos_CPT::handle_dashboard_session_request($request());
if ($session->status !== 200 || $session->data['scope'] !== 'vehicle_observations' || isset($session->data['token'])) throw new RuntimeException('Alan scope or fixed session lifetime is invalid');
if (Savol_Veiculos_CPT::dashboard_can_edit_vehicle($request()) !== true) throw new RuntimeException('Alan cannot open vehicle observations');
if (Savol_Veiculos_CPT::dashboard_can_view_price_history($request()) !== true) throw new RuntimeException('Alan cannot view vehicle price history');

$updated = Savol_Veiculos_CPT::handle_dashboard_vehicle_update_request($request(['meta' => ['observacoes_gerais' => '  Precisa revisar  ']]));
if ($updated->status !== 200 || $meta[42]['observacoes_gerais'] !== 'Precisa revisar') throw new RuntimeException('Observations were not saved');

$photo_reason = Savol_Veiculos_CPT::handle_dashboard_vehicle_update_request($request(['meta' => ['motivo_sem_foto' => '  Aguardando fotografo  ']]));
if ($photo_reason->status !== 200 || $meta[42]['motivo_sem_foto'] !== 'Aguardando fotografo') throw new RuntimeException('Photo reason was not saved');

$both = Savol_Veiculos_CPT::handle_dashboard_vehicle_update_request($request(['meta' => [
    'observacoes_gerais' => 'Revisar novamente',
    'motivo_sem_foto' => 'Em preparacao',
]]));
if ($both->status !== 200 || $meta[42]['observacoes_gerais'] !== 'Revisar novamente' || $meta[42]['motivo_sem_foto'] !== 'Em preparacao') {
    throw new RuntimeException('Allowed fields were not saved together');
}
function get_transient(string $key) { global $transients; return $transients[$key] ?? false; }
function set_transient(string $key, $value, int $ttl): bool { global $transients; $transients[$key] = $value; return true; }
function delete_transient(string $key): bool { global $transients; unset($transients[$key]); return true; }
function wp_generate_password(int $length, bool $special = true, bool $extra = false): string { return str_repeat('a', $length); }
function wp_hash_password(string $value): string { return password_hash($value, PASSWORD_DEFAULT); }
function wp_check_password(string $value, string $hash): bool { return password_verify($value, $hash); }
function wp_authenticate(string $username, string $password) { return $password === 'correct-password' ? new WP_User($username) : new WP_Error('invalid', 'invalid', []); }
function wp_mail(string $email, string $subject, string $message): bool { global $last_mail; $last_mail = compact('email', 'subject', 'message'); return true; }

foreach ([['meta' => ['preco' => 1]], ['meta' => ['observacoes_gerais' => 'ok'], 'status' => 'publish']] as $payload) {
    $blocked = Savol_Veiculos_CPT::handle_dashboard_vehicle_update_request($request($payload));
    if (!$blocked instanceof WP_Error || $blocked->data['status'] !== 403) throw new RuntimeException('Restricted user changed another field');
}

$publish = Savol_Veiculos_CPT::dashboard_can_manage_vehicle($request());
if (!$publish instanceof WP_Error || $publish->data['status'] !== 403) throw new RuntimeException('Restricted user can publish');

$current_login = 'joao';
$read_only_session = Savol_Veiculos_CPT::handle_dashboard_session_request($request());
if ($read_only_session->status !== 200 || $read_only_session->data['scope'] !== 'read_only') throw new RuntimeException('Joao scope is not read-only');
if (Savol_Veiculos_CPT::dashboard_can_edit_vehicle($request()) !== true) throw new RuntimeException('Read-only user cannot view vehicle details');
$blocked_edit = Savol_Veiculos_CPT::dashboard_can_edit_vehicle($request([], 'PATCH'));
if (!$blocked_edit instanceof WP_Error || $blocked_edit->data['status'] !== 403) throw new RuntimeException('Read-only user can edit vehicles');
$blocked_publish = Savol_Veiculos_CPT::dashboard_can_manage_vehicle($request([], 'PATCH'));
if (!$blocked_publish instanceof WP_Error || $blocked_publish->data['status'] !== 403) throw new RuntimeException('Read-only user can publish vehicles');
if (Savol_Veiculos_CPT::dashboard_can_view_price_history($request()) !== true) throw new RuntimeException('Read-only user cannot view price history');
if (Savol_Veiculos_CPT::dashboard_can_view_data($request()) !== true) throw new RuntimeException('Read-only user cannot view dashboard data');
if (Savol_Veiculos_CPT::dashboard_can_view_admin_data($request()) !== true) throw new RuntimeException('Read-only user cannot view activity');
$blocked_users = Savol_Veiculos_CPT::dashboard_can_create_users($request([], 'POST'));
if (!$blocked_users instanceof WP_Error || $blocked_users->data['status'] !== 403) throw new RuntimeException('Read-only user can manage users');

$_SERVER['REMOTE_ADDR'] = '127.0.0.1';
$login = Savol_Veiculos_CPT::handle_dashboard_login_request(new WP_REST_Request([
    'username' => 'joao',
    'password' => 'correct-password',
]));
if (SAVOL_DASHBOARD_2FA_ENABLED) {
    if ($login->status !== 202 || empty($login->data['requires2fa']) || !empty($login->data['token'])) throw new RuntimeException('Password login bypassed 2FA');
    if (!preg_match('/(\d{6})/', (string) ($last_mail['message'] ?? ''), $code_match)) throw new RuntimeException('2FA code was not sent');
    $verification = Savol_Veiculos_CPT::handle_dashboard_2fa_verify_request(new WP_REST_Request([
        'challenge' => $login->data['challenge'],
        'code' => $code_match[1],
    ]));
    if ($verification->status !== 200 || empty($verification->data['token'])) throw new RuntimeException('Valid 2FA code did not create a session');
} else {
    if ($login->status !== 200 || empty($login->data['token']) || !empty($login->data['requires2fa'])) throw new RuntimeException('Password-only login did not create a session');
    if ($last_mail !== []) throw new RuntimeException('Disabled 2FA sent an email');
    if ($login->data['user']['scope'] !== 'read_only') throw new RuntimeException('Login changed user scope');
    $session = Savol_Veiculos_CPT::handle_dashboard_session_request(new WP_REST_Request([], [], 'Bearer ' . $login->data['token']));
    if ($session->status !== 200) throw new RuntimeException('Password-only token is invalid');
    $disabled = Savol_Veiculos_CPT::handle_dashboard_2fa_verify_request(new WP_REST_Request(['challenge' => str_repeat('a', 48), 'code' => '123456']));
    if ($disabled->status !== 410) throw new RuntimeException('Disabled 2FA endpoint accepted a challenge');
}

$denied = Savol_Veiculos_CPT::handle_dashboard_login_request(new WP_REST_Request(['username' => 'not-authorized', 'password' => 'correct-password']));
if ($denied->status !== 401 || !empty($denied->data['token'])) throw new RuntimeException('Unauthorized user received a token');

for ($attempt = 1; $attempt <= 5; $attempt++) {
    $invalid_login = Savol_Veiculos_CPT::handle_dashboard_login_request(new WP_REST_Request([
        'username' => 'blocked-user',
        'password' => 'wrong-password',
    ]));
    if ($invalid_login->status !== 401) throw new RuntimeException('Invalid password did not fail safely');
}
$limited_login = Savol_Veiculos_CPT::handle_dashboard_login_request(new WP_REST_Request([
    'username' => 'blocked-user',
    'password' => 'wrong-password',
]));
if ($limited_login->status !== 429) throw new RuntimeException('Login rate limit was not enforced');

echo "Observations access test passed\n";
