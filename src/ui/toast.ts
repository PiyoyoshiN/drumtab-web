import { h } from "./ui";

let toastEl: HTMLDivElement | null = null;

export function toast(msg: string) {
  if (!toastEl) {
    toastEl = h("div") as HTMLDivElement;
    toastEl.style.position = "fixed";
    toastEl.style.right = "16px";
    toastEl.style.bottom = "16px";
    toastEl.style.padding = "10px 12px";
    toastEl.style.borderRadius = "12px";
    toastEl.style.border = "1px solid rgba(255,255,255,.12)";
    toastEl.style.background = "rgba(10,14,24,.9)";
    toastEl.style.boxShadow = "0 12px 30px rgba(0,0,0,.35)";
    toastEl.style.color = "white";
    toastEl.style.maxWidth = "420px";
    toastEl.style.zIndex = "9999";
    document.body.appendChild(toastEl);
  }

  toastEl.textContent = msg;
  toastEl.style.opacity = "1";
  window.setTimeout(() => {
    if (toastEl) toastEl.style.opacity = "0";
  }, 2200);
}