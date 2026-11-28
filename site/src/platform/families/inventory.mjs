/**
 * §6.2 필수 컴포넌트 207항목의 분류(docs/platform/components.md 분류표의 원천).
 *
 *   independent  그 자체로 하나의 재료(기반 컴포넌트·목적 패밀리·구형 부품)로 구현한다
 *   variant      다른 재료의 외형·동작·kind 값 하나로 구현한다. 새 재료 종류가 아니다
 *   composite    여러 컴포넌트를 묶은 동작 패턴이다
 *
 * 키는 Material Coverage Manifest의 요구 id에서 `req:comp:`를 뺀 값이다. 항목 목록은 REQUEST.md §6.2가 정하고
 * tests/platform-family-inventory.test.mjs가 요구 목록과 이 표가 일대일인지, 문서 표와 Manifest가 이 표와 맞는지 본다.
 *
 * 판단 근거가 필요한 경계는 REQUEST §6.1의 계층 예시를 따른다.
 *   `Card Surface → KPI Card → KPI Grid → Dashboard Summary Section`: KPI Card는 Purpose 한 칸(독립), KPI Grid는 그것을 묶은 패턴(복합).
 *   `Button → Icon Button → Button Group → Bulk Action Toolbar`: Button Group과 Bulk Action Toolbar는 버튼을 묶은 패턴(복합)이다.
 * Phone·URL Input은 Email·Password·Number Input과 같은 입력 kind 값이라 변형이다.
 */
const I = 'independent', V = 'variant', C = 'composite';

export const COMPONENT_CLASSIFICATION = Object.freeze({
  'a-01-button': I, 'a-02-icon-button': V, 'a-03-link-button': V, 'a-04-toggle-button': V, 'a-05-split-button': C, 'a-06-menu-button': C, 'a-07-floating-action-button': V, 'a-08-button-group': C, 'a-09-segmented-control': V, 'a-10-copy-button': V, 'a-11-close-button': V, 'a-12-loading-action-button': V,
  'b-01-text-input': I, 'b-02-textarea': V, 'b-03-search-input': I, 'b-04-password-input': V, 'b-05-number-input': V, 'b-06-currency-input': I, 'b-07-email-input': V, 'b-08-phone-input': V, 'b-09-url-input': V, 'b-10-otp-input': I, 'b-11-tag-input': I, 'b-12-file-input': I, 'b-13-drag-and-drop-upload': I, 'b-14-input-group': I,
  'c-01-select': I, 'c-02-searchable-select': V, 'c-03-combobox': V, 'c-04-multi-select': V, 'c-05-grouped-select': I, 'c-06-radio': I, 'c-07-radio-group': I, 'c-08-radio-card': I, 'c-09-checkbox': I, 'c-10-checkbox-group': I, 'c-11-switch': I, 'c-12-slider': I, 'c-13-range-slider': I, 'c-14-rating': I, 'c-15-color-picker': I,
  'd-01-calendar': I, 'd-02-date-picker': I, 'd-03-date-range-picker': I, 'd-04-time-picker': I, 'd-05-datetime-picker': I, 'd-06-month-picker': I, 'd-07-week-picker': I, 'd-08-schedule-selector': I,
  'e-01-navbar': I, 'e-02-sidebar': I, 'e-03-collapsible-sidebar': I, 'e-04-breadcrumb': I, 'e-05-tabs': I, 'e-06-vertical-tabs': V, 'e-07-underline-tabs': V, 'e-08-stepper': I, 'e-09-pagination': I, 'e-10-bottom-navigation': I, 'e-11-navigation-drawer': I, 'e-12-table-of-contents': I, 'e-13-command-menu': I, 'e-14-context-menu': I,
  'f-01-basic-card': I, 'f-02-feature-card': I, 'f-03-kpi-card': I, 'f-04-statistic-card': I, 'f-05-metric-trend-card': V, 'f-06-product-card': I, 'f-07-product-comparison-card': C, 'f-08-profile-card': I, 'f-09-team-member-card': I, 'f-10-article-card': I, 'f-11-media-card': V, 'f-12-pricing-card': I, 'f-13-plan-card': I, 'f-14-notification-card': I, 'f-15-activity-card': I, 'f-16-settings-card': V, 'f-17-integration-card': I, 'f-18-review-card': I, 'f-19-testimonial-card': I, 'f-20-interactive-selection-card': I, 'f-21-dashboard-widget-card': C, 'f-22-financial-asset-card': I,
  'g-01-basic-table': I, 'g-02-data-table': I, 'g-03-sortable-table': V, 'g-04-filterable-table': I, 'g-05-selectable-table': V, 'g-06-expandable-row-table': I, 'g-07-grouped-table': I, 'g-08-dense-table': I, 'g-09-description-list': I, 'g-10-list': I, 'g-11-list-item': C, 'g-12-tree-view': I, 'g-13-kanban': I, 'g-14-timeline': I, 'g-15-activity-feed': V, 'g-16-master-detail': C, 'g-17-key-value-inspector': C, 'g-18-log-viewer': C, 'g-19-code-block': I, 'g-20-diff-viewer': I,
  'h-01-modal': I, 'h-02-alert-dialog': V, 'h-03-confirmation-dialog': I, 'h-04-drawer': I, 'h-05-bottom-sheet': V, 'h-06-popover': I, 'h-07-tooltip': I, 'h-08-dropdown-menu': I, 'h-09-contextual-help': I,
  'i-01-alert': I, 'i-02-banner': V, 'i-03-callout': I, 'i-04-toast': V, 'i-05-snackbar': V, 'i-06-inline-error': V, 'i-07-empty-state': I, 'i-08-error-state': I, 'i-09-success-state': I, 'i-10-skeleton': I, 'i-11-spinner': I, 'i-12-linear-progress': I, 'i-13-circular-progress': I, 'i-14-step-progress': V, 'i-15-loading-overlay': I, 'i-16-status-indicator': I,
  'j-01-badge': V, 'j-02-status-badge': I, 'j-03-chip': V, 'j-04-filter-chip': V, 'j-05-tag': V, 'j-06-avatar': I, 'j-07-avatar-group': I, 'j-08-accordion': I, 'j-09-collapsible': I, 'j-10-divider': I, 'j-11-counter': I, 'j-12-notification-indicator': I, 'j-13-keyboard-shortcut': I, 'j-14-metadata-row': I, 'j-15-stat-comparison': I,
  'k-01-image': V, 'k-02-responsive-image': I, 'k-03-media-frame': I, 'k-04-gallery': C, 'k-05-carousel': C, 'k-06-video-frame': V, 'k-07-audio-player-ui': I, 'k-08-file-preview': I, 'k-09-image-comparison': C, 'k-10-figure-and-caption': C, 'k-11-quote': I, 'k-12-rich-text-content': I,
  'l-01-stack': I, 'l-02-cluster': I, 'l-03-grid': I, 'l-04-responsive-grid': I, 'l-05-split': I, 'l-06-bento': C, 'l-07-container': I, 'l-08-section': I, 'l-09-center': I, 'l-10-sidebar-layout': C, 'l-11-master-detail-layout': C, 'l-12-sticky-region': C, 'l-13-scroll-area': C, 'l-14-resizable-panel': C,
  'm-01-filter-toolbar': C, 'm-02-search-toolbar': C, 'm-03-bulk-action-toolbar': C, 'm-04-data-summary': C, 'm-05-dashboard-kpi-grid': C, 'm-06-approval-panel': C, 'm-07-audit-log': C, 'm-08-permission-matrix': C, 'm-09-status-management': C, 'm-10-settings-form': C, 'm-11-search-result-list': C, 'm-12-user-management-table': C, 'm-13-task-list': C, 'm-14-workflow-steps': C, 'm-15-comment-thread': C,
  'n-01-product-grid': I, 'n-02-product-detail-summary': I, 'n-03-product-variant-selector': C, 'n-04-quantity-selector': I, 'n-05-price-display': I, 'n-06-discount-display': I, 'n-07-cart-item': I, 'n-08-cart-summary': I, 'n-09-checkout-summary': I, 'n-10-order-status': I, 'n-11-review-summary': I,
  'o-01-mobile-header': I, 'o-02-bottom-navigation': I, 'o-03-action-sheet': I, 'o-04-mobile-list-cell': I, 'o-05-mobile-search': I, 'o-06-mobile-tab-bar': I, 'o-07-full-screen-dialog': I, 'o-08-mobile-filter-panel': I, 'o-09-sticky-bottom-action': I, 'o-10-safe-area-container': I,
});

export const CLASSIFICATION_LABEL = Object.freeze({independent: '독립 재료', variant: '변형', composite: '복합 패턴'});

export function classificationCounts() {
  const counts = {independent: 0, variant: 0, composite: 0};
  for (const kind of Object.values(COMPONENT_CLASSIFICATION)) counts[kind] += 1;
  return counts;
}
