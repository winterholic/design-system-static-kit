import {DocArticle, docMetadata, docStaticParams, type DocParams} from '../../DocArticle';

export const dynamicParams = false;

export const generateMetadata = (props: DocParams) => docMetadata('guide', props);
export const generateStaticParams = () => docStaticParams('guide');

export default function Page(props: DocParams) {
  return <DocArticle section="guide" {...props} />;
}
