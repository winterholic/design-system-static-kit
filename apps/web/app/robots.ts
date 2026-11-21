import type {MetadataRoute} from 'next';

// /test-lab 은 시험 증거, /dev 는 내부 QA 이므로 검색 대상이 아니다(헤더 X-Robots-Tag 와 이중).
export default function robots(): MetadataRoute.Robots {
  return {rules: {userAgent: '*', allow: '/', disallow: ['/test-lab/', '/dev/']}};
}
