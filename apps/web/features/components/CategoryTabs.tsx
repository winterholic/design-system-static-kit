'use client';

import styles from './components.module.css';
import {CATALOG_CATEGORIES} from './catalog-model.mjs';

export function CategoryTabs({selected, counts, onSelect}: {
  selected: string;
  counts: Record<string, number>;
  onSelect: (category: string) => void;
}) {
  // REQUEST §8.1: 모바일에서는 카테고리를 스크롤 가능한 탭으로 둔다. 의도한 가로 스크롤 영역이라 레이아웃 검사에 알린다(data-layout-scroll).
  return (
    <div className={styles.categoryScroller} aria-label="카테고리" data-layout-scroll>
      <div className={styles.categoryTabs} role="tablist" aria-label="컴포넌트 카테고리">
        {CATALOG_CATEGORIES.map(({id, label}) => (
          <button key={id} type="button" role="tab" aria-selected={selected === id} aria-controls="catalog-panel"
            id={`catalog-tab-${id}`} className={styles.categoryTab} onClick={() => onSelect(id)}>
            {label}<span className={styles.tabCount}>{counts[id] ?? 0}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
