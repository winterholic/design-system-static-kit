/** 편집 계층 진입점. React·Next.js·DOM·Node 전용 모듈 없이 브라우저와 Node에서 같게 동작한다(ADR 0008). */
export {OPS, opNames, applyOp, setTheme, setPalette, setAppearance, setLayoutVariant, updateNode, insertNode, removeNode, moveNode, replaceTemplate, importBlueprint, resetDocument, parsePath, pathString, diffDocs, deepEqual, deepFreeze} from './ops.mjs';
export {contentEntries, contentFingerprint, contentDiff, keepsContent, sameContent, PRESENTATION_FIELDS} from './fingerprint.mjs';
export {checkDocument, applySequence, checkSequence, GRADES} from './contracts.mjs';
export {partExample, partTypes, partTypesAt, insertableParts, addPlacements, themeChoices, themeVariantChoices, paletteChoices, modeChoices, axisChoices, layoutChoices} from './applicability.mjs';
