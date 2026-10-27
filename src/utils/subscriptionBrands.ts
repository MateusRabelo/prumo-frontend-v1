export const subscriptionBrands=[
  {name:'Brisanet',aliases:['brisanet','brisa'],file:'brisanet.png'},
  {name:'TIM',aliases:['tim'],file:'tim.svg',background:'#002B70'},
  {name:'Spotify',aliases:['spotify'],file:'spotify.svg'},
  {name:'Netflix',aliases:['netflix'],file:'netflix.svg'},
  {name:'YouTube Premium',aliases:['youtube'],file:'youtube.svg'},
  {name:'iCloud',aliases:['icloud'],file:'icloud.svg'},
];
export function subscriptionBrand(name:string){
  const normalized=name.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ');
  return subscriptionBrands.find(brand=>brand.aliases.some(alias=>new RegExp(`(^|\\s)${alias}(\\s|$)`).test(normalized)));
}
