import {missingFunctions} from './platform.server';

/** 조립 서비스 함수가 아직 Core 에 공개되지 않았을 때의 안내. 대신 보여 줄 값을 웹이 만들지 않는다. */
export function Unavailable({what, requires}: {what: string; requires?: string}) {
  const names = missingFunctions();
  const dependency = requires ?? (names.join(', ') || '조립 함수');
  return (
    <div className="note" role="status" data-testid="platform-unavailable">
      <p><strong>{what}</strong>은 조립 서비스 연결을 기다리는 중입니다.</p>
      <p>Core 서비스에 <code>{dependency}</code>가 공개되면 이 화면이 실제 결과로 채워집니다. 웹은 이 값을 직접 만들지 않습니다.</p>
    </div>
  );
}
