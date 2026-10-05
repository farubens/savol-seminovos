<?php
define('ABSPATH', __DIR__);
define('HOUR_IN_SECONDS', 3600);

class WP_User {
    public int $ID = 7;
    public string $user_login = 'alan';
    public string $display_name = 'Alan';
    public string $user_email = 'alan@example.invalid';
    public string $user_pass;
    public string $user_registered = '2026-01-01 00:00:00';
    public array $roles = ['editor'];
    public function __construct() { $this->user_pass = password_hash('current-password', PASSWORD_DEFAULT); }
}
class WP_REST_Request {
    public function __construct(private array $params = [], private string $method = 'GET', private string $token = '') {}
    public function get_param(string $name) { return $this->params[$name] ?? null; }
    public function get_method(): string { return $this->method; }
    public function get_header(string $name): string { return $name === 'authorization' ? 'Bearer ' . $this->token : ''; }
}
class WP_REST_Response {
    public function __construct(public array $data, public int $status) {}
}
class WP_Error {
    public function __construct(public string $code, public string $message, public array $data = []) {}
    public function get_error_message(): string { return $this->message; }
}
class AccountTestDB {
    public string $prefix = 'wp_';
    public array $rows = [];
    public function insert($table, $data, $formats) { $this->rows[] = $data; }
}
$wpdb = new AccountTestDB();
$account = new WP_User();
$writes = [];
function get_user_by($field, $id) { global $account; return $field === 'id' && $id === 7 ? clone $account : false; }
function wp_salt($scheme) { return 'account-test-secret'; }
function wp_json_encode($data) { return json_encode($data); }
function absint($value) { return abs((int) $value); }
function user_can($user, $capability) { return false; }
function wp_set_current_user($id) {}
function wp_check_password($password, $hash, $id = 0) { return password_verify($password, $hash); }
function sanitize_text_field($value) { return trim($value); }
function sanitize_email($value) { return trim($value); }
function sanitize_user($value) { return $value; }
function sanitize_key($value) { return $value; }
function is_email($value) { return filter_var($value, FILTER_VALIDATE_EMAIL); }
function is_wp_error($value) { return $value instanceof WP_Error; }
function current_time($format, $gmt = false) { return '2026-10-05 12:00:00'; }
if (!function_exists('mb_substr')) { function mb_substr($value, $start, $length) { return substr($value, $start, $length); } }
function wp_update_user($payload) {
    global $account, $writes;
    if ($payload['user_email'] === 'taken@example.invalid') return new WP_Error('existing_user_email', 'Email already used');
    $writes[] = $payload;
    foreach ($payload as $field => $value) {
        $account->$field = $field === 'user_pass' ? password_hash($value, PASSWORD_DEFAULT) : $value;
    }
    return $account->ID;
}
require dirname(__DIR__) . '/modules/vehicles/class-savol-veiculos-cpt.php';
function expect($condition, $message) { if (!$condition) throw new RuntimeException($message); }
$token_method = new ReflectionMethod(Savol_Veiculos_CPT::class, 'create_dashboard_token');
$token = $token_method->invoke(null, $account);
$request = static fn($params = [], $method = 'GET') => new WP_REST_Request($params, $method, $token);
expect(Savol_Veiculos_CPT::dashboard_can_view_data($request()) === true, 'Restricted user cannot view own account');
$anonymous = Savol_Veiculos_CPT::handle_dashboard_account_request(new WP_REST_Request());
expect($anonymous instanceof WP_Error && $anonymous->data['status'] === 401, 'Anonymous account exposed');
$own = Savol_Veiculos_CPT::handle_dashboard_account_request($request(['id' => 999]));
expect($own->data['user']['id'] === 7 && !isset($own->data['user']['user_pass']), 'Wrong user or password hash exposed');
$params = ['id' => 999, 'name' => 'Alan Atualizado', 'email' => 'alan@example.invalid', 'currentPassword' => 'wrong', 'role' => 'administrator'];
$denied = Savol_Veiculos_CPT::handle_dashboard_account_request($request($params, 'PATCH'));
expect($denied->status === 403 && count($writes) === 0, 'Update accepted without current password');
$params['currentPassword'] = 'current-password';
$invalid = Savol_Veiculos_CPT::handle_dashboard_account_request($request(array_merge($params, ['password' => 'short']), 'PATCH'));
expect($invalid->status === 422 && count($writes) === 0, 'Short password accepted');
$duplicate = Savol_Veiculos_CPT::handle_dashboard_account_request($request(array_merge($params, ['email' => 'taken@example.invalid']), 'PATCH'));
expect($duplicate->status === 422 && count($writes) === 0, 'Duplicate email accepted');
$saved = Savol_Veiculos_CPT::handle_dashboard_account_request($request($params, 'PATCH'));
expect($saved->status === 200 && $writes[0]['ID'] === 7 && !isset($writes[0]['role']), 'Client selected another account or role');
expect($saved->data['user']['name'] === 'Alan Atualizado' && count($wpdb->rows) === 1, 'Profile update or audit failed');
$changed = Savol_Veiculos_CPT::handle_dashboard_account_request($request(array_merge($params, ['password' => 'new-password-123']), 'PATCH'));
expect($changed->data['passwordChanged'] === true, 'Password update not reported');
expect(Savol_Veiculos_CPT::handle_dashboard_account_request($request()) instanceof WP_Error, 'Old session survived password change');
echo "Account access tests passed\n";
