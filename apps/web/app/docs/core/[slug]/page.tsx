import {DocArticle, docMetadata, docStaticParams, type DocParams} from '../../DocArticle';

export const dynamicParams = false;

export const generateMetadata = (props: DocParams) => docMetadata('core', props);
export const generateStaticParams = () => docStaticParams('core');

export default function Page(props: DocParams) {
  return <DocArticle section="core" {...props} />;
}
