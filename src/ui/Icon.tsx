/** One icon from the in-page <symbol> set (see core/icons.js). Decorative: hidden from screen readers. */
export function Icon(props: { name: string; class?: string }) {
  return (
    <svg class={props.class ? `i ${props.class}` : 'i'} aria-hidden="true">
      <use href={`#i-${props.name}`} />
    </svg>
  );
}
