// Raw HTML imports (webpack `asset/source`) — used by the hidden /owl-docs tool
// to inline its self-contained document generator into an <iframe srcDoc>.
declare module "*.html" {
  const content: string;
  export default content;
}
