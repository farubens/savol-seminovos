<?php
define('ABSPATH', __DIR__);

class WP_User {
    public int $ID = 7;
    public string $user_login = 'alan';
}

class WP_REST_Request {
    public function __construct(private array $params = [], private array $body = [], private string $authorization = '') {}
    public function get_param(string $key) { return $this->params[$key] ?? null; }
    public function get_json_params(): array { return $this->body; }
    public function get_header(string $key): string { return $key === 'authorization' ? $this->authorization : ''; }
}

class WP_REST_Response {
    public function __construct(public array $data, public int $status) {}
}

class WP_Error {
    public function __construct(public string $code, public string $message, public array $data) {}
}

$meta = [];
function absint($value): int { return abs((int) $value); }
function wp_salt(string $scheme): string { return 'test-secret'; }
function get_user_by(string $field, int $id): ?WP_User { return $field === 'id' && $id === 7 ? new WP_User() : null; }
function get_post_type(int $post_id): string { return $post_id === 42 ? 'veiculo' : 'post'; }
function user_can(WP_User $user, string $capability, ...$args): bool { return false; }
function wp_set_current_user(int $id): void {}
function sanitize_textarea_field(string $value): string { return trim($value); }
function update_post_meta(int $post_id, string $key, string $value): void {
    global $meta;
    $meta[$post_id][$key] = $value;
}

require dirname(__DIR__) . '/modules/vehicles/class-savol-veiculos-cpt.php';

$payload = rtrim(strtr(base64_encode(json_encode(['user_id' => 7, 'expires_at' => time() + 3600])), '+/', '-_'), '=');
$token = $payload . '.' . hash_hmac('sha256', $payload, wp_salt('auth'));
$request = static fn(array $body = []) => new WP_REST_Request(['id' => 42], $body, 'Bearer ' . $token);

$session = Savol_Veiculos_CPT::handle_dashboard_session_request($request());
if ($session->status !== 200 || $session->data['scope'] !== 'vehicle_observations') throw new RuntimeException('Alan scope was not restricted');
if (Savol_Veiculos_CPT::dashboard_can_edit_vehicle($request()) !== true) throw new RuntimeException('Alan cannot open vehicle observations');

$updated = Savol_Veiculos_CPT::handle_dashboard_vehicle_update_request($request(['meta' => ['observacoes_gerais' => '  Precisa revisar  ']]));
if ($updated->status !== 200 || $meta[42]['observacoes_gerais'] !== 'Precisa revisar') throw new RuntimeException('Observations were not saved');

foreach ([['meta' => ['preco' => 1]], ['meta' => ['observacoes_gerais' => 'ok'], 'status' => 'publish']] as $payload) {
    $blocked = Savol_Veiculos_CPT::handle_dashboard_vehicle_update_request($request($payload));
    if (!$blocked instanceof WP_Error || $blocked->data['status'] !== 403) throw new RuntimeException('Restricted user changed another field');
}

$publish = Savol_Veiculos_CPT::dashboard_can_manage_vehicle($request());
if (!$publish instanceof WP_Error || $publish->data['status'] !== 403) throw new RuntimeException('Restricted user can publish');

echo "Observations access test passed\n";
