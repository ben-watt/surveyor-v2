export default WhiteSpaceFilter;
declare class WhiteSpaceFilter extends Handler {
  filter(content: any): void;
  filterEmpty(node: any): 1 | 2;
}
import Handler from '../handler.js';
