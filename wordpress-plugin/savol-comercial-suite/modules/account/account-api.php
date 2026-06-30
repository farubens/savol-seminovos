<?php
if (!defined('ABSPATH')) {
    exit;
}

const SAVOL_ACCOUNT_TOKEN_META = '_savol_account_token';
const SAVOL_ACCOUNT_FAVORITES_META = '_savol_vehicle_favorites';
const SAVOL_ACCOUNT_VISITED_META = '_savol_vehicle_visited';

add_action('rest_api_init', function () {
    register_rest_route('savol/v1', '/customer/session', [
        'methods' => 'POST',
        'callback' => 'savol_account_create_session',
        'permission_callback' => '__return_true',
    ]);

    register_rest_route('savol/v1', '/customer/login', [
        'methods' => 'POST',
        'callback' => 'savol_account_login',
        'permission_callback' => '__return_true',
    ]);

    register_rest_route('savol/v1', '/customer/register', [
        'methods' => 'POST',
        'callback' => 'savol_account_register',
        'permission_callback' => '__return_true',
    ]);

    register_rest_route('savol/v1', '/customer/garage', [
        [
            'methods' => 'GET',
            'callback' => 'savol_account_get_garage',
            'permission_callback' => 'savol_account_can_access_garage',
        ],
        [
            'methods' => 'POST',
            'callback' => 'savol_account_update_garage',
            'permission_callback' => 'savol_account_can_access_garage',
        ],
    ]);
});

function savol_account_json_error(string $message, int $status = 400): WP_Error
{
    return new WP_Error('savol_account_error', $message, ['status' => $status]);
}

function savol_account_normalize_email($value): string
{
    return sanitize_email(strtolower(trim((string) $value)));
}

function savol_account_get_bearer_token(WP_REST_Request $request): string
{
    $header = $request->get_header('authorization');
    if (!$header || stripos($header, 'Bearer ') !== 0) {
        return '';
    }

    return trim(substr($header, 7));
}

function savol_account_find_user_by_token(string $token)
{
    if (!$token) {
        return null;
    }

    $users = get_users([
        'number' => 1,
        'fields' => 'ID',
        'meta_key' => SAVOL_ACCOUNT_TOKEN_META,
        'meta_value' => sanitize_text_field($token),
    ]);

    return $users ? (int) $users[0] : null;
}

function savol_account_can_access_garage(WP_REST_Request $request): bool
{
    return (bool) savol_account_find_user_by_token(savol_account_get_bearer_token($request));
}

function savol_account_create_session(WP_REST_Request $request)
{
    $name = sanitize_text_field($request->get_param('name'));
    $email = savol_account_normalize_email($request->get_param('email'));

    if (!$name) {
        return savol_account_json_error('Informe o nome.');
    }

    if (!$email || !is_email($email)) {
        return savol_account_json_error('Informe um e-mail vÃ¡lido.');
    }

    $user = get_user_by('email', $email);

    if (!$user) {
        $username = sanitize_user(current(explode('@', $email)), true);
        if (!$username) {
            $username = 'cliente';
        }

        $base_username = $username;
        $suffix = 1;
        while (username_exists($username)) {
            $suffix++;
            $username = $base_username . $suffix;
        }

        $user_id = wp_insert_user([
            'user_login' => $username,
            'user_email' => $email,
            'display_name' => $name,
            'first_name' => $name,
            'role' => 'subscriber',
            'user_pass' => wp_generate_password(32, true, true),
        ]);

        if (is_wp_error($user_id)) {
            return savol_account_json_error('NÃ£o foi possÃ­vel criar o usuÃ¡rio.', 500);
        }
    } else {
        $user_id = (int) $user->ID;
        wp_update_user([
            'ID' => $user_id,
            'display_name' => $name,
            'first_name' => $name,
        ]);
    }

    $token = get_user_meta($user_id, SAVOL_ACCOUNT_TOKEN_META, true);
    if (!$token) {
        $token = wp_generate_password(48, false, false);
        update_user_meta($user_id, SAVOL_ACCOUNT_TOKEN_META, $token);
    }

    return [
        'user' => [
            'id' => $user_id,
            'name' => $name,
            'email' => $email,
        ],
        'token' => $token,
        'garage' => savol_account_read_garage($user_id),
    ];
}

function savol_account_get_or_create_token(int $user_id): string
{
    $token = get_user_meta($user_id, SAVOL_ACCOUNT_TOKEN_META, true);
    if (!$token) {
        $token = wp_generate_password(48, false, false);
        update_user_meta($user_id, SAVOL_ACCOUNT_TOKEN_META, $token);
    }

    return $token;
}

function savol_account_user_payload(int $user_id): array
{
    $user = get_user_by('id', $user_id);
    $name = $user ? ($user->display_name ?: current(explode('@', $user->user_email))) : 'Cliente Savol';
    $email = $user ? $user->user_email : '';

    return [
        'id' => $user_id,
        'name' => $name,
        'email' => $email,
    ];
}

function savol_account_session_response(int $user_id): array
{
    return [
        'user' => savol_account_user_payload($user_id),
        'token' => savol_account_get_or_create_token($user_id),
        'garage' => savol_account_read_garage($user_id),
    ];
}

function savol_account_login(WP_REST_Request $request)
{
    $email = savol_account_normalize_email($request->get_param('email'));
    $password = (string) $request->get_param('password');

    if (!$email || !is_email($email)) {
        return savol_account_json_error('Informe um e-mail vÃ¡lido.');
    }

    if (!$password) {
        return savol_account_json_error('Informe sua senha.');
    }

    $user = get_user_by('email', $email);
    if (!$user || !wp_check_password($password, $user->user_pass, $user->ID)) {
        return savol_account_json_error('E-mail ou senha invÃ¡lidos.', 401);
    }

    return savol_account_session_response((int) $user->ID);
}

function savol_account_register(WP_REST_Request $request)
{
    $email = savol_account_normalize_email($request->get_param('email'));
    $password = (string) $request->get_param('password');
    $password_confirmation = (string) $request->get_param('passwordConfirmation');

    if (!$email || !is_email($email)) {
        return savol_account_json_error('Informe um e-mail vÃ¡lido.');
    }

    if (email_exists($email)) {
        return savol_account_json_error('Este e-mail jÃ¡ estÃ¡ cadastrado. Use a opÃ§Ã£o Entrar.', 409);
    }

    if (strlen($password) < 6) {
        return savol_account_json_error('A senha precisa ter pelo menos 6 caracteres.');
    }

    if ($password !== $password_confirmation) {
        return savol_account_json_error('As senhas nÃ£o conferem.');
    }

    $username = sanitize_user(current(explode('@', $email)), true);
    if (!$username) {
        $username = 'cliente';
    }

    $base_username = $username;
    $suffix = 1;
    while (username_exists($username)) {
        $suffix++;
        $username = $base_username . $suffix;
    }

    $display_name = current(explode('@', $email));
    $user_id = wp_insert_user([
        'user_login' => $username,
        'user_email' => $email,
        'display_name' => $display_name,
        'first_name' => $display_name,
        'role' => 'subscriber',
        'user_pass' => $password,
    ]);

    if (is_wp_error($user_id)) {
        return savol_account_json_error('NÃ£o foi possÃ­vel criar o usuÃ¡rio.', 500);
    }

    return savol_account_session_response((int) $user_id);
}

function savol_account_read_garage(int $user_id): array
{
    $favorites = get_user_meta($user_id, SAVOL_ACCOUNT_FAVORITES_META, true);
    $visited = get_user_meta($user_id, SAVOL_ACCOUNT_VISITED_META, true);

    return [
        'favorites' => is_array($favorites) ? array_values(array_map('intval', $favorites)) : [],
        'visited' => is_array($visited) ? array_values(array_map('intval', $visited)) : [],
    ];
}

function savol_account_sanitize_vehicle_ids($value, int $limit = 100): array
{
    if (!is_array($value)) {
        return [];
    }

    $ids = [];
    foreach ($value as $id) {
        $numeric_id = absint($id);
        if ($numeric_id > 0 && !in_array($numeric_id, $ids, true)) {
            $ids[] = $numeric_id;
        }
    }

    return array_slice($ids, 0, $limit);
}

function savol_account_get_garage(WP_REST_Request $request)
{
    $user_id = savol_account_find_user_by_token(savol_account_get_bearer_token($request));
    if (!$user_id) {
        return savol_account_json_error('SessÃ£o invÃ¡lida.', 401);
    }

    return savol_account_read_garage($user_id);
}

function savol_account_update_garage(WP_REST_Request $request)
{
    $user_id = savol_account_find_user_by_token(savol_account_get_bearer_token($request));
    if (!$user_id) {
        return savol_account_json_error('SessÃ£o invÃ¡lida.', 401);
    }

    $favorites = savol_account_sanitize_vehicle_ids($request->get_param('favorites'), 120);
    $visited = savol_account_sanitize_vehicle_ids($request->get_param('visited'), 80);

    update_user_meta($user_id, SAVOL_ACCOUNT_FAVORITES_META, $favorites);
    update_user_meta($user_id, SAVOL_ACCOUNT_VISITED_META, $visited);

    return savol_account_read_garage($user_id);
}

