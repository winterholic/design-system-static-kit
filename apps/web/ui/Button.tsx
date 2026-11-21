import Link from 'next/link';
import type {ButtonHTMLAttributes, ReactNode} from 'react';
import {cx} from './cx';
import styles from './ui.module.css';

export type ButtonVariant = 'primary' | 'secondary' | 'quiet';
export type ButtonSize = 'sm' | 'md';

const classes = (variant: ButtonVariant, size: ButtonSize, extra?: string) => cx(styles.button, styles[variant], size === 'sm' && styles.sm, extra);

/** 사이트의 모든 버튼. 비활성은 disabled 속성 하나로 정하고, 이유가 있으면 title로 밝힌다. */
export function Button({variant = 'secondary', size = 'md', className, type = 'button', ...rest}: ButtonHTMLAttributes<HTMLButtonElement> & {variant?: ButtonVariant; size?: ButtonSize}) {
  return <button type={type} className={classes(variant, size, className)} {...rest} />;
}

/** 버튼 모양의 링크. external은 사이트 밖 주소(rel 부여), newTab은 새 창으로 열며 스크린리더에 새 창임을 알린다. */
export function ButtonLink({href, variant = 'primary', size = 'md', external, newTab, className, children}: {href: string; variant?: ButtonVariant; size?: ButtonSize; external?: boolean; newTab?: boolean; className?: string; children: ReactNode}) {
  if (newTab) return <a href={href} target="_blank" rel="noopener" className={classes(variant, size, className)}>{children}<span className="visually-hidden"> (새 창)</span></a>;
  if (external) return <a href={href} rel="noopener" className={classes(variant, size, className)}>{children}</a>;
  return <Link href={href} className={classes(variant, size, className)}>{children}</Link>;
}
