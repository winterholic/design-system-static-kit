/** 클래스 이름을 합친다. 거짓 값은 건너뛴다. */
export const cx = (...parts: (string | false | null | undefined)[]) => parts.filter(Boolean).join(' ');
