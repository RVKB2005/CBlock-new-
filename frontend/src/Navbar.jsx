import React from 'react';
export default function Navbar({onNav}){
  return (
    <div style={{display:'flex', gap:8, marginBottom:12}}>
      <button onClick={()=>onNav('tokens')}>My Tokens</button>
      <button onClick={()=>onNav('mint')}>Mint</button>
      <button onClick={()=>onNav('market')}>Marketplace</button>
      <button onClick={()=>onNav('retire')}>Retire</button>
    </div>
  );
}