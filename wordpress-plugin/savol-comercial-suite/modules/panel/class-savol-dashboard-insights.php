<?php
if (!defined('ABSPATH')) { exit; }

final class Savol_Dashboard_Insights {
    private array $vehicles = [];

    public static function dates($start, $end) {
        foreach ([$start, $end] as $value) {
            if (!is_string($value) || ($value !== '' && (!preg_match('/^\d{4}-\d{2}-\d{2}$/D', $value)
                || !checkdate((int) substr($value, 5, 2), (int) substr($value, 8, 2), (int) substr($value, 0, 4))))) {
                return new WP_Error('savol_invalid_period', 'Periodo invalido.', ['status' => 400]);
            }
        }
        if (($start === '') !== ($end === '') || ($start !== '' && $start > $end)) {
            return new WP_Error('savol_invalid_period', 'Informe um periodo valido.', ['status' => 400]);
        }
        return [$start, $end];
    }

    private static function store_key(string $name): string {
        $name = preg_replace('/[^a-z0-9]+/', ' ', strtolower(remove_accents($name)));
        $name = str_replace(['sao bernardo do campo', 'sao bernardo', 'sao caetano do sul', 'sao caetano', 'volkswagen'], ['sbc', 'sbc', 'scs', 'scs', 'volks'], $name);
        $name = preg_replace('/\b(savol|unidade|loja|solo|citroen)\b/', '', $name);
        if (strpos($name, 'jetour') !== false) $name = str_replace('dom pedro', 'santo andre', $name);
        return trim(preg_replace('/\s+/', '-', trim($name)), '-') ?: 'unassigned';
    }

    private static function json($value): array {
        if (is_array($value)) return $value;
        $decoded = json_decode((string) $value, true);
        return is_array($decoded) ? $decoded : [];
    }

    private function vehicle(int $id): ?array {
        if ($id <= 0) return null;
        if (array_key_exists($id, $this->vehicles)) return $this->vehicles[$id];
        $post = get_post($id);
        if (!$post || $post->post_type !== 'veiculo' || in_array($post->post_status, ['trash', 'auto-draft'], true)) return $this->vehicles[$id] = null;
        $terms = get_the_terms($id, 'veiculo_unidade');
        $term = !is_wp_error($terms) && !empty($terms) ? reset($terms) : null;
        $store = $term ? $term->name : '';
        return $this->vehicles[$id] = [
            'key' => 'vehicle-' . $id, 'id' => $id, 'name' => wp_strip_all_tags($post->post_title),
            'plate' => (string) get_post_meta($id, 'placa', true), 'store' => $store,
            'image' => get_the_post_thumbnail_url($id, 'medium') ?: '',
        ];
    }

    private function finance_vehicle(array $vehicle, string $name, string $store): ?array {
        $id = absint($vehicle['id'] ?? 0);
        $found = $id ? $this->vehicle($id) : null;
        if (!$found && !empty($vehicle['url'])) {
            $path = (string) wp_parse_url((string) $vehicle['url'], PHP_URL_PATH);
            $post = get_page_by_path(sanitize_title(rawurldecode(basename(rtrim($path, '/')))), OBJECT, 'veiculo');
            if ($post) $found = $this->vehicle((int) $post->ID);
        }
        if ($found) return $found;
        $plate = preg_replace('/[^A-Z0-9]/', '', strtoupper((string) ($vehicle['plate'] ?? '')));
        if ($plate !== '') {
            $ids = get_posts(['post_type' => 'veiculo', 'post_status' => ['publish', 'draft', 'private', 'pending'], 'fields' => 'ids', 'posts_per_page' => 2, 'meta_key' => 'placa', 'meta_value' => $plate]);
            if (count($ids) === 1) return $this->vehicle((int) $ids[0]);
        }
        if ($name === '' && $plate === '') return null;
        return ['key' => 'legacy-' . hash('sha256', $store . '|' . ($plate ?: $name)), 'id' => null, 'name' => wp_strip_all_tags($name) ?: '--', 'plate' => $plate, 'store' => $store, 'image' => ''];
    }

    public static function is_bank_lead(string $form, array $meta): bool {
        return strpos(strtolower($form), 'banco-volks') === 0
            || strtolower((string) ($meta['source_integration'] ?? '')) === 'banco-volks'
            || strtoupper(trim((string) ($meta['suborigem_descricao'] ?? ''))) === 'BANCO VOLKS';
    }

    public static function handle(WP_REST_Request $request) {
        $period = self::dates($request->get_param('dateStart') ?? '', $request->get_param('dateEnd') ?? '');
        if (is_wp_error($period)) return $period;
        $store = $request->get_param('store') ?? '';
        if (!is_string($store) || strlen($store) > 150) return new WP_Error('savol_invalid_store', 'Unidade invalida.', ['status' => 400]);
        return (new self())->report($period[0], $period[1], sanitize_key($store));
    }

    private function report(string $start, string $end, string $store) {
        global $wpdb;
        $table = $wpdb->prefix . 'savol_painel_analytics';
        $exists = $wpdb->get_var($wpdb->prepare('SHOW TABLES LIKE %s', $wpdb->esc_like($table))) === $table;
        $date_sql = $start !== '' ? $wpdb->prepare(' AND created_at >= %s AND created_at <= %s', $start . ' 00:00:00', $end . ' 23:59:59') : '';
        $events = $exists ? $wpdb->get_results("SELECT COALESCE(post_id, 0) AS vehicle_id, event_type, COUNT(*) AS total FROM {$table} WHERE event_type IN ('pageview', 'vehicle_view') {$date_sql} GROUP BY post_id, event_type", ARRAY_A) : [];
        if ($wpdb->last_error) return new WP_Error('savol_insights_unavailable', 'Nao foi possivel consultar os indicadores.', ['status' => 503]);

        // Only public stock is eligible for zero views; older vehicles enter via recorded activity.
        $args = ['post_type' => 'veiculo', 'post_status' => 'publish', 'fields' => 'ids', 'posts_per_page' => -1, 'no_found_rows' => true];
        if ($end !== '') $args['date_query'] = [['before' => $end . ' 23:59:59', 'inclusive' => true]];
        $vehicle_ids = get_posts($args);
        _prime_post_caches(array_unique(array_merge($vehicle_ids, array_map(static fn($event) => (int) $event['vehicle_id'], $events))), true, true);
        foreach ($vehicle_ids as $id) $this->vehicle((int) $id);
        foreach ($events as $event) $this->vehicle((int) $event['vehicle_id']);

        $post_date_sql = $start !== '' ? $wpdb->prepare(' AND p.post_date >= %s AND p.post_date <= %s', $start . ' 00:00:00', $end . ' 23:59:59') : '';
        $sell_count = (int) $wpdb->get_var("SELECT COUNT(*) FROM {$wpdb->posts} p WHERE p.post_type = 'venda_carro_lead' AND p.post_status IN ('publish','private','draft','pending') {$post_date_sql}");
        if ($wpdb->last_error) return new WP_Error('savol_insights_unavailable', 'Nao foi possivel consultar os leads.', ['status' => 503]);
        $leads = [];
        // Read attribution fields in batches. Customer identities never enter the response.
        for ($offset = 0; ; $offset += 500) {
            $rows = $wpdb->get_results("SELECT p.ID,
                MAX(CASE WHEN m.meta_key = '_savol_finance_vehicle' THEN m.meta_value END) AS vehicle,
                MAX(CASE WHEN m.meta_key = '_savol_finance_vehicle_name' THEN m.meta_value END) AS vehicle_name,
                MAX(CASE WHEN m.meta_key = '_savol_finance_unit' THEN m.meta_value END) AS unit,
                MAX(CASE WHEN m.meta_key = '_savol_finance_form' THEN m.meta_value END) AS form,
                MAX(CASE WHEN m.meta_key = '_savol_finance_meta' THEN m.meta_value END) AS meta
                FROM {$wpdb->posts} p LEFT JOIN {$wpdb->postmeta} m ON m.post_id = p.ID
                AND m.meta_key IN ('_savol_finance_vehicle','_savol_finance_vehicle_name','_savol_finance_unit','_savol_finance_form','_savol_finance_meta')
                WHERE p.post_type = 'savol_finance_lead' AND p.post_status IN ('publish','private','draft','pending') {$post_date_sql}
                GROUP BY p.ID ORDER BY p.ID LIMIT 500 OFFSET {$offset}", ARRAY_A);
            if ($wpdb->last_error) return new WP_Error('savol_insights_unavailable', 'Nao foi possivel consultar os leads.', ['status' => 503]);
            foreach ($rows as $row) {
                $raw_store = trim((string) $row['unit']);
                if (preg_match('/^\d+$|simulador/i', $raw_store)) $raw_store = '';
                $vehicle = $this->finance_vehicle(self::json($row['vehicle']), (string) $row['vehicle_name'], $raw_store);
                if ($vehicle && $vehicle['store'] === '' && $raw_store !== '') {
                    $vehicle['store'] = $raw_store;
                    if ($vehicle['id']) $this->vehicles[$vehicle['id']] = $vehicle;
                }
                $leads[] = ['store' => (string) ($vehicle['store'] ?? $raw_store), 'vehicle' => $vehicle, 'bank' => self::is_bank_lead((string) $row['form'], self::json($row['meta']))];
            }
            if (count($rows) < 500) break;
        }
        $result = self::summarize(array_values(array_filter($this->vehicles)), $events, $leads, $sell_count, $store, $exists);
        $result['period'] = ['dateStart' => $start, 'dateEnd' => $end];
        $result['generatedAt'] = gmdate('c');
        return new WP_REST_Response($result, 200);
    }

    public static function summarize(array $vehicles, array $events, array $leads, int $sell_count, string $selected = '', bool $available = true): array {
        $stores = []; $ranked = []; $ids = [];
        $ensure_store = static function (string $name) use (&$stores): string {
            $key = self::store_key($name);
            if (!isset($stores[$key])) $stores[$key] = ['key' => $key, 'name' => $name ?: 'Site / sem unidade', 'views' => 0, 'sellLeads' => 0, 'leads' => 0, 'bankSimulations' => 0, 'mostViewed' => null, 'leastViewed' => null, 'mostSimulated' => null];
            return $key;
        };
        $add_vehicle = static function (array $vehicle) use (&$ranked, &$ids, $ensure_store): void {
            $unit = $ensure_store($vehicle['store']);
            if (!isset($ranked[$vehicle['key']])) $ranked[$vehicle['key']] = array_merge($vehicle, ['storeKey' => $unit, 'views' => 0, 'bankSimulations' => 0]);
            if ($vehicle['id']) $ids[$vehicle['id']] = $vehicle['key'];
        };
        foreach ($vehicles as $vehicle) $add_vehicle($vehicle);
        foreach ($events as $event) {
            $key = $ids[(int) $event['vehicle_id']] ?? null;
            $unit = $key ? $ranked[$key]['storeKey'] : $ensure_store('');
            if ($event['event_type'] === 'pageview') $stores[$unit]['views'] += (int) $event['total'];
            if ($key && $event['event_type'] === 'vehicle_view') $ranked[$key]['views'] += (int) $event['total'];
        }
        // Sell-your-car has no destination unit; do not guess from the seller's vehicle.
        if ($sell_count > 0) {
            $unit = $ensure_store('');
            $stores[$unit]['sellLeads'] += $sell_count;
            $stores[$unit]['leads'] += $sell_count;
        }
        foreach ($leads as $lead) {
            $unit = $ensure_store($lead['store']);
            $stores[$unit]['leads']++;
            if ($lead['bank']) $stores[$unit]['bankSimulations']++;
            if ($lead['vehicle']) {
                $add_vehicle($lead['vehicle']);
                if ($lead['bank']) $ranked[$lead['vehicle']['key']]['bankSimulations']++;
            }
        }
        $view_rank = array_values($ranked);
        usort($view_rank, static fn($a, $b) => ($b['views'] <=> $a['views']) ?: strcmp($a['name'], $b['name']));
        foreach ($view_rank as $vehicle) {
            $unit = $vehicle['storeKey'];
            if (!$stores[$unit]['mostViewed'] && $vehicle['views'] > 0) $stores[$unit]['mostViewed'] = $vehicle;
            if (!$stores[$unit]['leastViewed'] || $vehicle['views'] < $stores[$unit]['leastViewed']['views']) $stores[$unit]['leastViewed'] = $vehicle;
        }
        $bank_rank = array_values(array_filter($ranked, static fn($v) => $v['bankSimulations'] > 0));
        usort($bank_rank, static fn($a, $b) => ($b['bankSimulations'] <=> $a['bankSimulations']) ?: strcmp($a['name'], $b['name']));
        foreach ($bank_rank as $vehicle) {
            $unit = $vehicle['storeKey'];
            if (!$stores[$unit]['mostSimulated']) $stores[$unit]['mostSimulated'] = $vehicle;
        }
        $options = array_map(static fn($s) => ['key' => $s['key'], 'name' => $s['name']], array_values($stores));
        if ($selected !== '') $stores = array_filter($stores, static fn($s) => $s['key'] === $selected);
        $totals = ['views' => 0, 'sellLeads' => 0, 'leads' => 0, 'bankSimulations' => 0];
        foreach ($stores as $row) foreach ($totals as $key => $_) $totals[$key] += $row[$key];
        return ['totals' => $totals, 'stores' => array_values($stores), 'storeOptions' => $options,
            'rankings' => [
                'views' => array_values(array_filter($view_rank, static fn($v) => $selected === '' || $v['storeKey'] === $selected)),
                'simulations' => array_values(array_filter($bank_rank, static fn($v) => $selected === '' || $v['storeKey'] === $selected)),
            ], 'analyticsAvailable' => $available];
    }
}
