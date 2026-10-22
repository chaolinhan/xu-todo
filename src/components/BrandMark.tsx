export function BrandMark({large=false}:{large?:boolean}) {
  return <img className={`brand-mark ${large?'large':''}`} src={`${import.meta.env.BASE_URL}icon.svg`} alt="" aria-hidden="true"/>
}
