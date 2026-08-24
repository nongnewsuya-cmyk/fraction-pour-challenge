(() => {
    const $ = (id) => document.getElementById(id);
    const els = {
      app:$('app'), numA:$('numA'), numB:$('numB'), den:$('den'), limitOne:$('limitOne'),
      setBtn:$('setBtn'), randomBtn:$('randomBtn'), difficulty:$('difficulty'),
      status:$('status'), problemText:$('problemText'), fracA:$('fracA'), fracB:$('fracB'), fracR:$('fracR'),
      waterA:$('waterA'), waterB:$('waterB'), waterR:$('waterR'),
      measureA:$('measureA'), measureB:$('measureB'), measureR:$('measureR'),
      answerZone:$('answerZone'), pourBtn:$('pourBtn'), observeBtn:$('observeBtn'),
      summaryBtn:$('summaryBtn'), observeBox:$('observeBox'), summaryBox:$('summaryBox'),
      equationSummary:$('equationSummary'), obs1:$('obs1'), obs2:$('obs2'),
      wrapA:$('wrapA'), wrapB:$('wrapB'), lab:$('lab'), live:$('live'),
      soundBtn:$('soundBtn'), screenBtn:$('screenBtn'), resetBtnTop:$('resetBtnTop')
    };

    let state = { a:3, b:2, d:8, selected:null, poured:false, sound:true, phase:1 };

    const fractionHTML = (n,d) => `
      <span aria-label="${n} ส่วน ${d}" style="display:inline-flex;align-items:center;gap:.12em;vertical-align:middle">
        <span style="display:inline-flex;flex-direction:column;align-items:center;line-height:1">
          <span style="border-bottom:2px solid currentColor;padding:0 .13em .08em">${n}</span>
          <span style="padding:.08em .13em 0">${d}</span>
        </span>
      </span>`;

    function beep(freq=520, duration=.08){
      if(!state.sound) return;
      try{
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.value=freq; osc.type='sine';
        gain.gain.setValueAtTime(.05,ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+duration);
        osc.connect(gain); gain.connect(ctx.destination);
        osc.start(); osc.stop(ctx.currentTime+duration);
        setTimeout(()=>ctx.close(),250);
      }catch(e){}
    }

    function setStatus(msg,type=''){
      els.status.textContent=msg;
      els.status.className='status'+(type?` ${type}`:'');
      els.live.textContent=msg;
    }

    function setPhase(n){
      state.phase=n;
      document.querySelectorAll('.step').forEach((el)=>{
        const s=Number(el.dataset.step);
        el.classList.toggle('active',s===n);
        el.classList.toggle('done',s<n);
      });
    }

    function clamp(v,min,max){ return Math.max(min,Math.min(max,v)); }

    function validateInputs(){
      const d=Number(els.den.value);
      let a=Math.floor(Number(els.numA.value));
      let b=Math.floor(Number(els.numB.value));
      if(!Number.isFinite(a)||!Number.isFinite(b)||!Number.isFinite(d)) return {ok:false,msg:'กรุณากรอกตัวเลขให้ครบ'};
      a=clamp(a,1,d-1); b=clamp(b,1,d-1);
      els.numA.value=a; els.numB.value=b;
      if(els.limitOne.checked && a+b>d){
        return {ok:false,msg:`ผลบวก ${a}/${d} + ${b}/${d} เกิน 1 กรุณาลดตัวเศษ หรือปิดตัวเลือก “จำกัดผลบวกไม่เกิน 1”`};
      }
      return {ok:true,a,b,d};
    }

    function renderMeasure(target,d){
      target.innerHTML='';
      for(let i=0;i<=d;i++){
        if(i===0 || i===d || (d>=8 && i%2===0) || (d<8 && i%1===0)){
          const b=document.createElement('b');
          b.textContent=`${i}/${d}`;
          target.appendChild(b);
        }else{
          const span=document.createElement('span');
          span.textContent='·';
          target.appendChild(span);
        }
      }
    }

    function makeChoices(a,b,d){
      const sum=a+b;
      const candidates=[
        {n:sum,d},
        {n:sum,d:d*2},
        {n:clamp(sum+1,1,Math.max(d, sum+1)),d},
        {n:Math.max(1,sum-1),d},
      ];
      const unique=[];
      for(const c of candidates){
        const key=`${c.n}/${c.d}`;
        if(!unique.some(x=>x.key===key)) unique.push({...c,key});
        if(unique.length===3) break;
      }
      return unique.sort(()=>Math.random()-.5);
    }

    function renderChoices(){
      const {a,b,d}=state;
      const correctKey=`${a+b}/${d}`;
      els.answerZone.innerHTML='';
      makeChoices(a,b,d).forEach(c=>{
        const btn=document.createElement('button');
        btn.type='button'; btn.className='answer';
        btn.dataset.key=c.key;
        btn.innerHTML=fractionHTML(c.n,c.d);
        btn.setAttribute('aria-label',`คำตอบ ${c.n} ส่วน ${c.d}`);
        btn.addEventListener('click',()=>{
          if(state.poured) return;
          state.selected=c.key;
          [...els.answerZone.children].forEach(x=>x.classList.toggle('selected',x===btn));
          els.pourBtn.disabled=false;
          setPhase(2);
          if(c.key===correctKey) setStatus('บันทึกคำตอบแล้ว — ยังไม่เฉลยนะ ลองเทน้ำพิสูจน์กัน!', 'ok');
          else setStatus('บันทึกคำตอบแล้ว — มาพิสูจน์ด้วยการเทน้ำกัน!', '');
          beep(540,.08);
        });
        els.answerZone.appendChild(btn);
      });
    }

    function renderProblem(){
      const {a,b,d}=state;
      els.problemText.innerHTML=`${fractionHTML(a,d)} &nbsp;+&nbsp; ${fractionHTML(b,d)} &nbsp;=&nbsp; ?`;
      els.fracA.innerHTML=fractionHTML(a,d);
      els.fracB.innerHTML=fractionHTML(b,d);
      els.fracR.textContent='?';
      renderMeasure(els.measureA,d); renderMeasure(els.measureB,d); renderMeasure(els.measureR,d);
      requestAnimationFrame(()=>{
        els.waterA.style.height=`${(a/d)*100}%`;
        els.waterB.style.height=`${(b/d)*100}%`;
        els.waterR.style.height='0%';
      });
      renderChoices();
      els.pourBtn.disabled=true;
      els.observeBtn.disabled=true;
      els.summaryBtn.disabled=true;
      els.observeBox.classList.remove('show');
      els.summaryBox.classList.remove('show');
      els.wrapA.classList.remove('tilt-pour');
      els.wrapB.classList.remove('tilt-pour');
      els.lab.classList.remove('pouring','pouring-left','pouring-right');
      state.selected=null; state.poured=false;
      setPhase(1);
    }

    function setProblem(){
      const v=validateInputs();
      if(!v.ok){ setStatus(v.msg,'error'); beep(220,.12); return; }
      state.a=v.a; state.b=v.b; state.d=v.d;
      renderProblem();
      setStatus('โจทย์พร้อมแล้ว — ให้นักเรียนทายคำตอบก่อนเทน้ำ');
      beep(620,.08);
    }

    function randomProblem(){
      const groups={
        easy:[4,5,6],
        medium:[6,8,9],
        hard:[8,10,12]
      };
      const pool=groups[els.difficulty.value]||groups.medium;
      const d=pool[Math.floor(Math.random()*pool.length)];
      let a=1+Math.floor(Math.random()*(d-1));
      let b=1+Math.floor(Math.random()*(d-1));
      if(els.limitOne.checked && a+b>d){
        b=Math.max(1,d-a);
      }
      if(a+b===0){a=1;b=1}
      els.den.value=String(d); els.numA.value=a; els.numB.value=b;
      setProblem();
      setStatus('สุ่มโจทย์ใหม่แล้ว — พร้อมให้เด็กทาย!', 'ok');
    }

    function pour(){
      if(!state.selected) return;
      state.poured=true;
      setPhase(3);
      els.pourBtn.disabled=true;
      [...els.answerZone.children].forEach(x=>x.disabled=true);

      const firstHeight = Math.min(100,(state.a/state.d)*100);
      const finalHeight = Math.min(100,((state.a+state.b)/state.d)*100);
      const correctKey=`${state.a+state.b}/${state.d}`;

      setStatus('กำลังเทแก้ว A ก่อน — สังเกตระดับน้ำในแก้วรวมที่ค่อย ๆ สูงขึ้น', '');
      beep(410,.1);

      // ช่วงที่ 1: เทแก้ว A
      els.wrapA.classList.add('tilt-pour');
      setTimeout(()=>{
        els.waterA.style.height='0%';
        els.waterR.style.height=`${firstHeight}%`;
        els.fracR.innerHTML=fractionHTML(state.a,state.d);
      },220);

      // จบช่วงที่ 1
      setTimeout(()=>{
        els.wrapA.classList.remove('tilt-pour');
      },1200);

      // ช่วงที่ 2: เทแก้ว B
      setTimeout(()=>{
        setStatus('ต่อด้วยแก้ว B — ระดับน้ำในแก้วรวมจะสูงขึ้นเป็นผลบวกสุดท้าย', '');
        els.wrapB.classList.add('tilt-pour');
        beep(520,.09);
      },1320);
      setTimeout(()=>{
        els.waterB.style.height='0%';
        els.waterR.style.height=`${finalHeight}%`;
        els.fracR.innerHTML=fractionHTML(state.a+state.b,state.d);
      },1540);

      // จบทั้งหมด
      setTimeout(()=>{
        els.wrapB.classList.remove('tilt-pour');
        [...els.answerZone.children].forEach(btn=>{
          if(btn.dataset.key===correctKey) btn.classList.add('correct');
          if(btn.dataset.key===state.selected && btn.dataset.key!==correctKey) btn.classList.add('wrong');
        });
        els.observeBtn.disabled=false;
        setStatus(
          state.selected===correctKey
            ? 'ทายถูก! เห็นแล้วว่าเททีละแก้วจะได้ผลรวมสุดท้ายเท่าเดิม'
            : 'เทครบทั้งสองแก้วแล้ว ลองเปรียบเทียบกับคำตอบที่ทายไว้ และอธิบายว่าต่างกันตรงไหน',
          state.selected===correctKey?'ok':''
        );
        if(state.selected===correctKey){ confetti(); beep(760,.12); setTimeout(()=>beep(920,.12),130); }
        else beep(300,.15);
      },2650);
    }

    function observe(){
      const sum=state.a+state.b;
      els.obs1.innerHTML=`ก่อนเท มีน้ำ ${state.a} ส่วน และ ${state.b} ส่วน`;
      els.obs2.innerHTML=`หลังเท มีน้ำทั้งหมด ${sum} ส่วน จากทั้งหมด ${state.d} ส่วน`;
      els.observeBox.classList.add('show');
      els.summaryBtn.disabled=false;
      setPhase(4);
      setStatus('สังเกตแล้ว — ลองถามเด็กก่อนว่า “ทำไมเลขตัวส่วนไม่เปลี่ยน?”');
      beep(600,.08);
    }

    function summary(){
      const {a,b,d}=state, sum=a+b;
      els.equationSummary.innerHTML=
        `${fractionHTML(a,d)} + ${fractionHTML(b,d)} = ${fractionHTML(sum,d)}`+
        (sum===d ? ` = <b>1</b>` : '');
      els.summaryBox.classList.add('show');
      setPhase(5);
      setStatus('สรุปสำเร็จ — ตัวส่วนเท่ากัน ให้นำตัวเศษมาบวกกัน และตัวส่วนคงเดิม', 'ok');
      beep(760,.1);
    }

    function confetti(){
      const colors=['#2f80ed','#2eb872','#ff9f43','#7a5cff','#ff6f91','#ffd75b'];
      for(let i=0;i<36;i++){
        const el=document.createElement('i');
        el.className='confetti';
        el.style.left=(20+Math.random()*60)+'vw';
        el.style.top=(8+Math.random()*18)+'vh';
        el.style.background=colors[i%colors.length];
        el.style.setProperty('--dx',`${-160+Math.random()*320}px`);
        el.style.animationDelay=(Math.random()*.25)+'s';
        document.body.appendChild(el);
        setTimeout(()=>el.remove(),1900);
      }
    }

    function resetAll(){
      els.numA.value=3; els.numB.value=2; els.den.value='8'; els.limitOne.checked=true;
      state.a=3;state.b=2;state.d=8;
      renderProblem();
      setStatus('เริ่มใหม่แล้ว — ให้นักเรียนทายคำตอบก่อนเทน้ำ');
    }

    els.setBtn.addEventListener('click',setProblem);
    els.randomBtn.addEventListener('click',randomProblem);
    els.pourBtn.addEventListener('click',pour);
    els.observeBtn.addEventListener('click',observe);
    els.summaryBtn.addEventListener('click',summary);
    els.resetBtnTop.addEventListener('click',resetAll);
    els.soundBtn.addEventListener('click',()=>{
      state.sound=!state.sound;
      els.soundBtn.textContent=state.sound?'🔊 เสียง: เปิด':'🔇 เสียง: ปิด';
      if(state.sound) beep(650,.06);
    });
    els.screenBtn.addEventListener('click',()=>{
      els.app.classList.toggle('big-screen');
      els.screenBtn.textContent=els.app.classList.contains('big-screen')?'🎛️ แสดงแผงครู':'🖥️ โหมดหน้าชั้น';
    });

    [els.numA,els.numB,els.den,els.limitOne].forEach(el=>el.addEventListener('change',()=>{
      const d=Number(els.den.value);
      els.numA.max=d-1; els.numB.max=d-1;
    }));

    renderProblem();
  })();
