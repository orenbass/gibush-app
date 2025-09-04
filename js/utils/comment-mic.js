(function(){
    if (window.attachCommentMic) return;

    let active = null; // {recognition, button, textarea}
    const LONG_PRESS_MS = 420;

    function createRecognition(){
        const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SR) return null;
        const r = new SR();
        r.lang = 'he-IL';
        r.interimResults = true;
        r.continuous = true;
        return r;
    }

    function stopActive(manual){
        if (!active) return;
        try { active.recognition.stop(); } catch(_){}
        active.button.classList.remove('recording');
        active = null;
    }

    function startFor(button, textarea){
        // אם כבר פעיל על אותו כפתור – כבה
        if (active && active.button === button){
            stopActive(true);
            return;
        }
        // כבה קודם
        stopActive(true);

        const rec = createRecognition();
        if (!rec){
            button.disabled = true;
            button.textContent = 'לא נתמך';
            return;
        }

        const baseAtStart = textarea.value;
        active = { recognition: rec, button, textarea };
        button.classList.add('recording');

        rec.onresult = (ev)=>{
            let txt = baseAtStart;
            for (let i=ev.resultIndex;i<ev.results.length;i++){
                const res = ev.results[i];
                const tr = res[0].transcript;
                if (res.isFinal){
                    txt = (txt && !txt.endsWith(' ') ? txt + ' ' : txt) + tr.trim();
                }
            }
            textarea.value = txt;
        };
        rec.onend = ()=>{
            // אם המערכת סגרה (למשל iOS) – ננקה
            if (active && active.recognition === rec){
                stopActive(false);
            }
        };
        try { rec.start(); } catch(_){}
    }

    function attach(button, textarea){
        if (!button || !textarea) return;
        if (button._commentMicAttached) return;
        button._commentMicAttached = true;

        // קליק = טוגל
        button.addEventListener('click', e=>{
            e.preventDefault();
            startFor(button, textarea);
        });

        // לחיצה ארוכה – מקליט רק בזמן ההחזקה
        let pressTimer = null;
        function pressStart(){
            if (pressTimer) clearTimeout(pressTimer);
            pressTimer = setTimeout(()=>{
                if (!active || active.button !== button){
                    startFor(button, textarea);
                }
            }, LONG_PRESS_MS);
        }
        function pressCancel(){
            if (pressTimer){ clearTimeout(pressTimer); pressTimer = null; }
        }
        function pressEnd(){
            if (pressTimer){ clearTimeout(pressTimer); pressTimer = null; }
            if (active && active.button === button){
                stopActive(true);
            }
        }

        ['pointerdown','touchstart'].forEach(ev=>button.addEventListener(ev, pressStart));
        ['pointermove','touchmove','pointercancel','touchcancel','pointerleave','mouseleave'].forEach(ev=>button.addEventListener(ev, pressCancel));
        ['pointerup','touchend'].forEach(ev=>button.addEventListener(ev, pressEnd));
    }

    window.attachCommentMic = attach;
    window.stopAllCommentMics = ()=>stopActive(true);
})();
