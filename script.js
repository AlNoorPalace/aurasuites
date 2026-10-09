// Hero slider
const slides=[...document.querySelectorAll('.slide')];
let i=0,timer,paused=false;
const show=n=>{i=(n+slides.length)%slides.length;slides.forEach((s,k)=>s.classList.toggle('active',k===i));
 document.getElementById('count').textContent=`0${i+1} / 0${slides.length}`};
const start=()=>{clearInterval(timer);timer=setInterval(()=>!paused&&show(i+1),5500)};
document.getElementById('prev').onclick=()=>{show(i-1);start()};
document.getElementById('next').onclick=()=>{show(i+1);start()};
const pb=document.getElementById('pause');
pb.onclick=()=>{paused=!paused;pb.textContent=paused?'Play':'Pause'};
start();

// Mobile menu
const nav=document.querySelector('nav'),burger=document.querySelector('.burger');
burger.onclick=()=>burger.setAttribute('aria-expanded',nav.classList.toggle('open'));
nav.addEventListener('click',e=>{if(e.target.matches('a')){nav.classList.remove('open');burger.setAttribute('aria-expanded',false)}});

// Location links preselect the enquiry form
const form=document.getElementById('form');
document.querySelectorAll('[data-loc]').forEach(a=>a.addEventListener('click',()=>form.loc.value=a.dataset.loc));

// Enquiry: composes text only; nothing is sent
form.addEventListener('submit',e=>{
 e.preventDefault();
 const f=Object.fromEntries(new FormData(form));
 document.getElementById('out').value=
`Enquiry for Aura Suites ${f.loc}
Guests: ${f.guests}
Check-in: ${f.in||'—'}
Check-out: ${f.out||'—'}
Name: ${f.name}
Email: ${f.email}
Notes: ${f.msg||'—'}`;
 document.getElementById('result').hidden=false;
});
document.getElementById('copy').onclick=async e=>{
 const t=document.getElementById('out');
 try{await navigator.clipboard.writeText(t.value)}catch{t.select();document.execCommand('copy')}
 e.target.textContent='Copied';
};
