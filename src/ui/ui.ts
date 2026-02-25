export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props?: Partial<HTMLElementTagNameMap[K]> & {
    className?: string;
    onClick?: (e: MouseEvent) => void;
    textContent?: string;
  },
  ...children: (Node | string | null | undefined)[]
) {
  const el = document.createElement(tag);
  if (props) {
    const { className, onClick, ...rest } = props as any;
    if (className) el.className = className;
    if (onClick) el.addEventListener("click", onClick);
    Object.assign(el, rest);
  }
  for (const c of children) {
    if (c == null) continue;
    el.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
  }
  return el;
}