<?php
define('ABSPATH', __DIR__);
class WP_Error { public function __construct(public string $code, public string $message, public array $data = []) {} }
function remove_accents($value) { return iconv('UTF-8', 'ASCII//TRANSLIT', $value); }
require dirname(__DIR__) . '/modules/panel/class-savol-dashboard-insights.php';
function check($condition, $message) { if (!$condition) throw new RuntimeException($message); }
foreach ([['2026-02-30', '2026-03-01'], ['2026-10-02', '2026-10-01'], ['', '2026-10-01'], [[], ''], ["2026-10-01' OR 1=1", '2026-10-02']] as $dates) {
    check(Savol_Dashboard_Insights::dates(...$dates) instanceof WP_Error, 'Invalid dates accepted');
}
check(Savol_Dashboard_Insights::dates('2024-02-29', '2024-02-29') === ['2024-02-29', '2024-02-29'], 'Leap date rejected');
check(Savol_Dashboard_Insights::dates('', '') === ['', ''], 'All time rejected');
$vehicle = static fn($id, $name, $store) => ['key' => 'vehicle-' . $id, 'id' => $id, 'name' => $name, 'store' => $store, 'plate' => 'ABC1D23', 'image' => ''];
$a = $vehicle(1, 'Corolla', 'SAVOL TOYOTA SBC');
$b = $vehicle(2, 'Yaris', 'SAVOL TOYOTA SBC');
$c = $vehicle(3, 'Polo', 'SAVOL VOLKS SANTO ANDRE');
$events = [
    ['vehicle_id' => 1, 'event_type' => 'pageview', 'total' => 12],
    ['vehicle_id' => 1, 'event_type' => 'vehicle_view', 'total' => 12],
    ['vehicle_id' => 3, 'event_type' => 'pageview', 'total' => 6],
    ['vehicle_id' => 3, 'event_type' => 'vehicle_view', 'total' => 6],
    ['vehicle_id' => 0, 'event_type' => 'pageview', 'total' => 9],
    ['vehicle_id' => 99, 'event_type' => 'pageview', 'total' => 3],
];
$leads = [
    ['store' => $a['store'], 'vehicle' => $a, 'bank' => true, 'cpf' => 'PRIVATE'],
    ['store' => $a['store'], 'vehicle' => $a, 'bank' => true],
    ['store' => $c['store'], 'vehicle' => $c, 'bank' => false],
    ['store' => 'SAVOL TOYOTA SAO BERNARDO DO CAMPO', 'vehicle' => null, 'bank' => false],
    ['store' => '', 'vehicle' => null, 'bank' => true],
];
$all = Savol_Dashboard_Insights::summarize([$a, $b, $c], $events, $leads, 4);
check($all['totals'] === ['views' => 30, 'sellLeads' => 4, 'leads' => 9, 'bankSimulations' => 3], 'Totals duplicate events or omit unattributed records');
$stores = array_column($all['stores'], null, 'key');
check(count($stores) === 3, 'Unit aliases were split');
check($stores['toyota-sbc']['leastViewed']['id'] === 2, 'Zero-view published vehicle missing');
check($stores['toyota-sbc']['mostViewed']['id'] === 1, 'Incorrect top vehicle');
check($stores['unassigned']['leads'] === 5 && $stores['unassigned']['views'] === 12, 'Unattributed records assigned to a dealer');
check($all['rankings']['simulations'][0]['id'] === 1 && count($all['rankings']['simulations']) === 1, 'Generic financing counted as Banco Volks');
check(strpos(json_encode($all), 'PRIVATE') === false, 'Lead identity leaked');
$filtered = Savol_Dashboard_Insights::summarize([$a, $b, $c], $events, $leads, 4, 'toyota-sbc');
check($filtered['totals'] === ['views' => 12, 'sellLeads' => 0, 'leads' => 3, 'bankSimulations' => 2], 'Unit totals ignore filter');
check(count($filtered['stores']) === 1 && count($filtered['rankings']['views']) === 2, 'Unit rankings ignore filter');
check(count($filtered['storeOptions']) === 3, 'Unit options lost on filtering');
$empty = Savol_Dashboard_Insights::summarize([], [], [], 0, '', false);
check(!$empty['analyticsAvailable'] && $empty['stores'] === [], 'Unavailable analytics represented as measured data');
check(Savol_Dashboard_Insights::is_bank_lead('banco-volks-card', []), 'Bank form ignored');
check(Savol_Dashboard_Insights::is_bank_lead('financiamento', ['source_integration' => 'banco-volks']), 'Bank callback ignored');
check(!Savol_Dashboard_Insights::is_bank_lead('financiamento', []), 'Generic form classified as bank');
echo "Dashboard insights tests passed\n";
