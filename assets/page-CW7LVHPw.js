import{r as e}from"./rolldown-runtime-S-ySWqyJ.js";import{i as t,r as n}from"./framework-CXnKph_e.js";var r=e(t(),1),i=`20260806001507`,a=n(),o=196,s=48,c=[{id:`rules`,x:16,y:16,title:`指引門檻表`,sub:`35 條 · 附章表頁次`,tone:`flowContent`},{id:`ingest`,x:262,y:16,title:`健保申報 JSON`,sub:`用藥 · 檢驗 · R/PR · DCSI`,tone:`flowNeutral`},{id:`decide`,x:16,y:112,title:`確定性事實與判定`,sub:`主題 · 目標 · 門檻（程式）`,tone:`flowNeutral`},{id:`llmText`,x:508,y:112,title:`LLM 好讀文字`,sub:`整理全部紀錄 · 數值照抄`,tone:`flowNeutral`},{id:`labFilter`,x:508,y:208,title:`濾掉無關檢驗`,sub:`微生物 · 血氣 · 白分類…`,tone:`flowNeutral`},{id:`selector`,x:16,y:304,title:`① 資料稽核`,sub:`找矛盾 · 進醫師版`,tone:`flowLlm`},{id:`labReview`,x:262,y:304,title:`② 檢驗判讀`,sub:`讀原始紀錄`,tone:`flowLlm`},{id:`narrative`,x:508,y:304,title:`③ 檢驗敘述`,sub:`寫成病人看的段落`,tone:`flowLlm`},{id:`assemble`,x:262,y:400,title:`驗證與組裝`,sub:`數值比對 · 禁止事項`,tone:`flowNeutral`},{id:`modules`,x:508,y:400,title:`固定衛教模組`,sub:`已審內容 · 模型不改寫`,tone:`flowContent`},{id:`patientReport`,x:140,y:496,title:`病人版衛教報告`,sub:`正文來自固定模組`,tone:`flowOut`},{id:`clinicianReport`,x:384,y:496,title:`醫師版報告`,sub:`附指引章表與頁次`,tone:`flowOut`}],l=[`M58 64 L58 112`,`M360 64 L360 88 L170 88 L170 112`,`M360 64 L360 88 L606 88 L606 112`,`M606 160 L606 208`,`M114 160 L114 304`,`M170 160 L170 272 L654 272 L654 304`,`M558 256 L558 288 L360 288 L360 304`,`M606 256 L606 304`,`M114 352 L114 376 L360 376 L360 400`,`M360 352 L360 400`,`M606 352 L606 376 L360 376 L360 400`,`M508 424 L458 424`,`M360 448 L360 472 L238 472 L238 496`,`M360 448 L360 472 L482 472 L482 496`],u={contentLibrary:[`rules`,`modules`],ingest:[`ingest`,`llmText`,`labFilter`],decide:[`decide`,`rules`],selector:[`selector`],labReview:[`labReview`],narrative:[`narrative`],assemble:[`assemble`,`modules`,`patientReport`,`clinicianReport`]};function d({highlight:e,compact:t=!1}){let n=e?.length?new Set(e):null,r=t?`flowArrowMini`:`flowArrow`;return(0,a.jsxs)(`svg`,{className:t?`flowDiagram flowMini`:`flowDiagram`,viewBox:`0 0 720 560`,role:`img`,"aria-label":n?`資料流位置：目前在「${c.filter(e=>n.has(e.id)).map(e=>e.title).join(`、`)}」`:`資料流：程式判定為主，三次 LLM 呼叫只負責規則做不到的事`,children:[(0,a.jsx)(`defs`,{children:(0,a.jsx)(`marker`,{id:r,viewBox:`0 0 10 10`,refX:`8`,refY:`5`,markerWidth:`6`,markerHeight:`6`,orient:`auto-start-reverse`,children:(0,a.jsx)(`path`,{d:`M2 1L8 5L2 9`,fill:`none`,stroke:`currentColor`,strokeWidth:`1.4`,strokeLinecap:`round`})})}),c.map(e=>{let r=n?!n.has(e.id):!1;return(0,a.jsxs)(`g`,{className:`${e.tone}${r?` flowDim`:``}${n&&!r?` flowActive`:``}`,children:[(0,a.jsx)(`rect`,{x:e.x,y:e.y,width:o,height:s,rx:6}),(0,a.jsx)(`text`,{className:`flowTitle`,x:e.x+o/2,y:t?e.y+30:e.y+21,textAnchor:`middle`,children:e.title}),t?null:(0,a.jsx)(`text`,{className:`flowSub`,x:e.x+o/2,y:e.y+38,textAnchor:`middle`,children:e.sub})]},e.id)}),(0,a.jsx)(`g`,{className:n?`flowLine flowDim`:`flowLine`,markerEnd:`url(#${r})`,children:l.map(e=>(0,a.jsx)(`path`,{d:e},e))})]})}var f={BASE:`固定納入`,TYPE:`糖尿病類型`,R1:`R1 眼睛`,R2:`R2 腦血管`,R3:`R3 腎臟`,R4:`R4 神經`,R5:`R5 心臟`,R6:`R6 下肢循環`},p={any:`不限型別`,"type1-confirmed":`僅第一型`,"type2-confirmed":`僅第二型`},m={"healthy-eating":`健康飲食`,"being-active":`規律活動`,monitoring:`自我監測`,"taking-medication":`規律用藥`,"problem-solving":`問題處理`,"reducing-risks":`降低風險`,"healthy-coping":`情緒調適`},h={"kidney-or-heart":`已知有腎臟或心臟問題`,"sick-day-hold-drugs":`有生病日需暫停的藥物`,sglt2:`使用 SGLT2 抑制劑`},g={"glycemic-target":`血糖目標`,"bp-target":`血壓目標`,"lipid-target":`血脂目標`,kidney:`腎臟`,"medication-safety":`用藥安全`,"screening-interval":`篩檢間隔`,"referral-urgency":`轉診急迫度`,"measurement-caveat":`判讀注意事項`},_=[`glycemic-target`,`bp-target`,`lipid-target`,`kidney`,`screening-interval`,`referral-urgency`,`medication-safety`,`measurement-caveat`],v={established:`已發生・完整模組`,"prevention-active":`尚未發生・預防內容`,"prevention-moderate":`尚未發生・適度介入`,excluded:`不納入`},y={established:`traceOutcome traceEstablished`,"prevention-active":`traceOutcome tracePrevention`,"prevention-moderate":`traceOutcome traceModerate`,excluded:`traceOutcome traceExcluded`},b={info:`留意`,attention:`需注意`,urgent:`需儘速處理`},x=`draft-0.3`,S=[{id:`BASE-01`,topic:`BASE`,title:`關於這份報告`,appliesWhen:`每份報告固定顯示，由程式自動加入。`,typeGate:`any`,autoOnly:!0,patientText:`這份內容是依報告產生當時可取得的既往健康資料整理，不會隨您之後的檢查、症狀或用藥變化自動更新。請先查看上方的「資料截至日期」；如果您最近的健康狀況已有改變，請以最新檢查結果及醫療團隊的評估為準。

本報告用來幫助您準備自我照護，不能取代診斷或處方。請勿只依本報告自行停藥、換藥、增減藥量或改變胰島素劑量。`},{id:`TYPE-UNCLEAR`,topic:`TYPE`,title:`關於您的糖尿病類型`,appliesWhen:`診斷碼、用藥或病史指向不一致，或無法確認類型時由程式自動加入。`,typeGate:`any`,autoOnly:!0,patientText:`目前資料無法一致確認您的糖尿病類型。第一型與第二型糖尿病在胰島素使用、低血糖與生病期間的照護方式可能不同，請在下次回診時向醫師確認診斷類型及適合您的自我照護方式。`},{id:`EYE-CORE`,topic:`R1`,title:`眼睛與視力`,appliesWhen:`R1 大於 0，或 PR1 為 1（適度介入）或 2（積極照護）。`,typeGate:`any`,autoOnly:!1,patientText:`糖尿病可能影響眼底的小血管。早期視網膜病變常沒有不舒服，視力正常也不代表眼底正常，所以定期眼底檢查很重要。

1. 記下最近一次眼底或散瞳檢查的日期與結果。若只做過一般視力檢查，回診時確認是否也做了眼底檢查。
2. 計畫懷孕、已懷孕，或近期血糖快速改變時，請告知眼科與糖尿病照護團隊。`,urgentSigns:`突然看不見、視力快速下降，或突然出現明顯黑影、重影：當天儘速就醫。`,needsShared:[`smoking`]},{id:`EYE-T1`,topic:`R1`,title:`第一型糖尿病眼底檢查補充`,appliesWhen:`已選 EYE-CORE，且糖尿病類型已明確確認為第一型。`,typeGate:`type1-confirmed`,autoOnly:!1,patientText:`第一型糖尿病在發病五年內，應完成第一次包含散瞳的完整眼科檢查。`},{id:`EYE-T2`,topic:`R1`,title:`第二型糖尿病眼底檢查補充`,appliesWhen:`已選 EYE-CORE，且糖尿病類型已明確確認為第二型。`,typeGate:`type2-confirmed`,autoOnly:!1,patientText:`第二型糖尿病在確診時可能已存在一段時間，因此診斷後應儘快完成第一次包含散瞳的完整眼科檢查。`},{id:`STROKE-CORE`,topic:`R2`,title:`腦血管`,appliesWhen:`R2 大於 0，或 PR2 為 1（適度介入）或 2（積極照護）。`,typeGate:`any`,autoOnly:!1,patientText:`血糖、血壓、血脂、吸菸與心律問題都可能影響腦血管。重點是持續管理可改善的因素，並讓自己和家人認得中風警訊。

1. 曾有短暫單側無力、嘴歪、說話不清、突然視力異常或走路不穩，即使症狀已消失也要儘速告訴醫師。
2. 若曾被告知有心房顫動或頸動脈問題，回診時確認是否需要進一步追蹤。`,urgentSigns:`記住「微笑、舉手、說你好」：微笑時臉部不對稱、雙手舉起時一側無力下垂，或說話突然不清楚，只要出現其中一項，就記下發生時間並立即撥打 119。不要等症狀自行消失，也不要自行開車就醫。`,needsShared:[`smoking`]},{id:`KIDNEY-CORE`,topic:`R3`,title:`腎臟`,appliesWhen:`R3 大於 0、CKD 欄位為 1、申報診斷碼有慢性腎臟病、檢驗證據達門檻，或 PR3 為 1（適度介入）或 2（積極照護）。`,typeGate:`any`,autoOnly:!1,patientText:`糖尿病腎臟病變早期通常沒有症狀，不能只靠水腫或不舒服來判斷；要看尿液白蛋白／肌酸酐比值（UACR）、血清肌酸酐與腎絲球過濾率（eGFR）。

1. 看診、看牙或領藥時主動告知自己的腎功能狀況。
2. 不長期自行服用非處方消炎止痛藥，也不用成分不明的中草藥、保健品或偏方。這不代表要停用醫師開立的藥；處方調整由醫師決定。
3. 飲水量、鹽分、蛋白質與鉀的限制須依個人腎功能、心臟狀況與營養評估決定，不要自行套用網路上的腎臟飲食。`,urgentSigns:`尿量突然明顯變少、腳或臉突然腫起、呼吸變喘、持續噁心嘔吐或意識變得不清楚：儘速就醫；若呼吸困難或意識改變明顯，立即撥打 119。`},{id:`KIDNEY-T1`,topic:`R3`,title:`第一型糖尿病腎臟檢查補充`,appliesWhen:`已選 KIDNEY-CORE，且糖尿病類型已明確確認為第一型。`,typeGate:`type1-confirmed`,autoOnly:!1,patientText:`第一型糖尿病通常從發病五年後開始定期接受 UACR、血清肌酸酐與 eGFR 檢查。`},{id:`KIDNEY-T2`,topic:`R3`,title:`第二型糖尿病腎臟檢查補充`,appliesWhen:`已選 KIDNEY-CORE，且糖尿病類型已明確確認為第二型。`,typeGate:`type2-confirmed`,autoOnly:!1,patientText:`第二型糖尿病在診斷時就應開始接受 UACR、血清肌酸酐與 eGFR 檢查。`},{id:`NERVE-CORE`,topic:`R4`,title:`神經與感覺`,appliesWhen:`R4 大於 0，或 PR4 為 1（適度介入）或 2（積極照護）。`,typeGate:`any`,autoOnly:!1,patientText:`糖尿病神經病變可能出現麻木、刺痛、灼熱、疼痛、感覺變鈍或平衡變差，早期也可能沒有症狀。感覺變差時小傷口不容易被發現，所以麻木不等於沒問題。類似症狀也可能來自其他疾病或營養問題，需由醫療人員評估。

1. 不要因為腳不痛就忽略傷口，也不要用熱水、電毯或熱敷測試足部感覺。
2. 若出現姿勢性頭暈、心跳異常、反覆噁心或腹瀉便祕、排尿困難、性功能改變，或低血糖越來越沒有警訊，請告訴醫療團隊——這些可能和自主神經有關。
3. 不要自行長期服用止痛藥或神經痛藥物。`,urgentSigns:`新出現明顯無力、走路突然不穩，或足部有傷口、紅腫、化膿、發燒、明顯變色：儘速就醫。`,needsShared:[`foot`]},{id:`NERVE-T1`,topic:`R4`,title:`第一型糖尿病神經檢查補充`,appliesWhen:`已選 NERVE-CORE，且糖尿病類型已明確確認為第一型。`,typeGate:`type1-confirmed`,autoOnly:!1,patientText:`第一型糖尿病在發病五年後開始每年評估；有症狀時不必等待滿五年，應提早提出。`},{id:`NERVE-T2`,topic:`R4`,title:`第二型糖尿病神經檢查補充`,appliesWhen:`已選 NERVE-CORE，且糖尿病類型已明確確認為第二型。`,typeGate:`type2-confirmed`,autoOnly:!1,patientText:`第二型糖尿病從診斷開始每年評估；若已有麻、痛、灼熱或感覺變差，請在回診時主動提出。`},{id:`HEART-CORE`,topic:`R5`,title:`心臟`,appliesWhen:`R5 大於 0，或 PR5 為 1（適度介入）或 2（積極照護）。`,typeGate:`any`,autoOnly:!1,patientText:`糖尿病常和高血壓、血脂異常、吸菸、腎功能問題與心血管疾病互相影響。保護心臟不是只看血糖。

1. 留意是否比以前容易喘、平躺時喘、腳腫、心悸、容易疲倦，或短時間內體重快速增加，並告訴醫療團隊。
2. 運動強度依體力、心臟狀況與醫療團隊建議逐步增加；活動時胸悶或喘就先停止並接受評估。`,urgentSigns:`突然胸悶或胸痛、喘不過氣、冒冷汗、噁心、頭暈或昏厥，或不尋常的背部疼痛併隨不適：立即撥打 119。不要自行開車，也不要嘗試以大力咳嗽取代就醫。`,needsShared:[`smoking`]},{id:`LEG-CIRCULATION-CORE`,topic:`R6`,title:`下肢循環`,appliesWhen:`R6 大於 0，或 PR6 為 1（適度介入）或 2（積極照護）。`,typeGate:`any`,autoOnly:!1,patientText:`周邊動脈疾病是腿部與足部的動脈循環變差。可能沒有症狀，也可能走一段路後小腿痠痛、休息後改善，或足部冰冷、顏色變淡、傷口不易癒合。這和神經麻木不同，但兩者可能同時存在。

1. 留意走路時是否固定在相近距離出現小腿、臀部或大腿疼痛、休息後是否改善。把位置、距離與持續時間記下來，回診時提供。
2. 已有足部傷口、休息時也疼痛、明顯變色或疑似嚴重缺血時，先接受醫療評估再決定運動方式。
3. 不要自行購買抗血小板藥物。`,urgentSigns:`一隻腳突然劇烈疼痛、變得明顯冰冷或蒼白、發紫、麻木或無力：立即就醫。若有傷口、紅腫、流膿、異味或發燒，也要儘快就醫。`,needsShared:[`foot`,`smoking`]}],C=new Map(S.map(e=>[e.id,e])),w=`2022-guideline-extract-0.5`,T={"t2-2022":`中華民國糖尿病學會《2022第2型糖尿病臨床照護指引》`,"t1-2022":`中華民國糖尿病學會《2022第1型糖尿病臨床照護指引》`},ee=T[`t2-2022`],E=[{id:`hba1c-general`,typeGate:`type2-confirmed`,targetValue:`低於 7.0%，並需個別化考量。`,category:`glycemic-target`,appliesTo:`一般成人`,statement:`糖化血色素控制目標為低於 7.0%，並需個別化考量。`,patientStatement:`糖化血色素建議控制在 7.0% 以下。實際目標會依您的年齡、病程與其他疾病調整，請以醫療團隊為您訂的數字為準。`,citation:{table:`表六 非懷孕成年人糖尿病的治療目標`,pdfPage:12},patientFacing:!0},{id:`fpg-general`,typeGate:`type2-confirmed`,targetValue:`80–130 mg/dL。`,category:`glycemic-target`,appliesTo:`一般成人`,statement:`空腹血糖控制目標為 80–130 mg/dL。`,citation:{section:`第九章 第 2 型糖尿病的血糖治療目標`,pdfPage:71},patientFacing:!0},{id:`ppg-general`,typeGate:`type2-confirmed`,targetValue:`80–160 mg/dL。`,category:`glycemic-target`,appliesTo:`一般成人`,statement:`餐後血糖控制目標為 80–160 mg/dL。`,citation:{section:`第九章 第 2 型糖尿病的血糖治療目標`,pdfPage:71},patientFacing:!0},{id:`hba1c-elderly-healthy`,targetValue:`放寬為低於 7–7.5%。`,category:`glycemic-target`,appliesTo:`65 歲以上、共病少且認知與身體機能正常`,statement:`糖化血色素目標放寬為低於 7–7.5%。`,citation:{table:`表七 老年糖尿病人（≥65 歲）的治療目標`,pdfPage:13},patientFacing:!0},{id:`hba1c-elderly-intermediate`,targetValue:`放寬為低於 8.0%。`,category:`glycemic-target`,appliesTo:`65 歲以上、多種共病或認知與身體機能輕至中度異常`,statement:`糖化血色素目標放寬為低於 8.0%。`,citation:{table:`表七 老年糖尿病人（≥65 歲）的治療目標`,pdfPage:13},patientFacing:!0},{id:`hba1c-elderly-poor`,targetValue:`不以糖化血色素作為唯一控制目標，重點在避免低血糖與有症狀的高血糖。`,category:`glycemic-target`,appliesTo:`65 歲以上、末期慢性病或認知與身體機能中至重度異常`,statement:`不以糖化血色素作為唯一控制目標，重點在避免低血糖與有症狀的高血糖。`,citation:{table:`表七 老年糖尿病人（≥65 歲）的治療目標`,pdfPage:13},patientFacing:!0},{id:`hypoglycemia-levels`,category:`glycemic-target`,appliesTo:`所有糖尿病人`,statement:`血糖低於 70 mg/dL 為第一級低血糖，低於 54 mg/dL 為第二級低血糖。`,citation:{table:`表一 低血糖分級`,pdfPage:141},patientFacing:!0},{id:`hba1c-unreliable`,category:`measurement-caveat`,appliesTo:`貧血、變異血色素、慢性腎病變或懷孕`,statement:`糖化血色素可能無法代表平均血糖，可加測糖化白蛋白與自我血糖監測輔助判讀。`,citation:{table:`表九 註 1`,pdfPage:18},patientFacing:!0},{id:`bp-treatment-threshold`,category:`bp-target`,appliesTo:`糖尿病人`,statement:`血壓達到或超過 140/90 mmHg 通常即開始高血壓治療。`,citation:{section:`第十四章 心血管併發症與其危險因子的處理`,pdfPage:146},patientFacing:!0},{id:`bp-target-general`,typeGate:`type2-confirmed`,targetValue:`140/90 mmHg 以下。`,category:`bp-target`,appliesTo:`一般糖尿病人`,statement:`血壓控制在 140/90 mmHg 以下。`,patientStatement:`血壓建議控制在 140/90 mmHg 以下。`,citation:{section:`第十四章 心血管併發症與其危險因子的處理`,pdfPage:146},patientFacing:!0},{id:`bp-target-intensive`,typeGate:`type2-confirmed`,targetValue:`在病人可承受的情況下可進一步控制至 130/80 mmHg。`,category:`bp-target`,appliesTo:`高心血管疾病風險或已有蛋白尿`,statement:`血壓進一步控制至 130/80 mmHg 以下；需同時注意降壓帶來的併發風險。`,patientStatement:`血壓建議控制在 130/80 mmHg 以下。若您有頭暈或站起來時眼前發黑，請回診時告訴醫療團隊，目標可以調整。`,citation:{section:`第十四章 心血管併發症與其危險因子的處理`,pdfPage:146},patientFacing:!0},{id:`ldl-general`,targetValue:`低於 100 mg/dL。`,category:`lipid-target`,appliesTo:`所有糖尿病人`,statement:`低密度脂蛋白膽固醇目標為低於 100 mg/dL。`,citation:{table:`表一 血脂的目標建議`,pdfPage:153},patientFacing:!0},{id:`ldl-cvd`,targetValue:`低於 70 mg/dL。`,category:`lipid-target`,appliesTo:`已有心血管疾病`,statement:`低密度脂蛋白膽固醇目標為低於 70 mg/dL。`,citation:{table:`表一 血脂的目標建議`,pdfPage:153},patientFacing:!0},{id:`hdl-target`,targetValue:`男性高於 40 mg/dL、女性高於 50 mg/dL。`,category:`lipid-target`,appliesTo:`所有糖尿病人`,statement:`高密度脂蛋白膽固醇目標為男性高於 40 mg/dL、女性高於 50 mg/dL。`,citation:{table:`表一 血脂的目標建議`,pdfPage:153},patientFacing:!0},{id:`tg-target`,targetValue:`低於 150 mg/dL；達到或超過 500 mg/dL 時需藥物處理。`,category:`lipid-target`,appliesTo:`所有糖尿病人`,statement:`三酸甘油酯目標為低於 150 mg/dL；達到或超過 500 mg/dL 時需藥物處理。`,patientStatement:`三酸甘油酯建議控制在 150 mg/dL 以下。`,citation:{table:`表一 血脂的目標建議`,pdfPage:153},patientFacing:!0},{id:`metformin-egfr-30`,category:`medication-safety`,appliesTo:`eGFR 低於 30 mL/min/1.73m²`,statement:`此腎功能下 metformin 屬禁用。`,citation:{section:`第十一章 口服抗糖尿病藥物（臨床建議表）`,pdfPage:97},patientFacing:!1},{id:`metformin-egfr-30-45`,category:`medication-safety`,appliesTo:`eGFR 介於 30–45 mL/min/1.73m²`,statement:`metformin 應減量使用。`,citation:{section:`第十一章 口服抗糖尿病藥物（臨床建議表）`,pdfPage:97},patientFacing:!1},{id:`albuminuria-diagnosis`,category:`kidney`,appliesTo:`尿液白蛋白/肌酸酐比值異常者`,statement:`異常結果應於 3–6 個月內重複測定，3 次檢查中有 2 次異常才診斷為蛋白尿。`,citation:{table:`表九 註 2`,pdfPage:18},patientFacing:!0},{id:`kidney-intensive-followup`,category:`screening-interval`,appliesTo:`UACR 超過 300 mg/g 或 eGFR 介於 30–60 mL/min/1.73m²（低於 30 不在本註範圍）`,statement:`至少每半年監測追蹤一次。`,citation:{table:`表九 註 3`,pdfPage:18},patientFacing:!0},{id:`interval-hba1c`,typeGate:`type2-confirmed`,category:`screening-interval`,appliesTo:`糖尿病人`,statement:`糖化血色素與血糖建議每 3 個月監測一次。`,citation:{table:`表九 臨床監測項目與建議頻率`,pdfPage:18},patientFacing:!0},{id:`interval-education`,category:`screening-interval`,appliesTo:`糖尿病人`,statement:`糖尿病衛教建議每 3 個月進行一次。`,citation:{table:`表九 臨床監測項目與建議頻率`,pdfPage:18},patientFacing:!0},{id:`interval-lipid`,category:`screening-interval`,appliesTo:`糖尿病人`,statement:`血脂建議每年檢查一次；若血脂異常或正在使用降血脂藥物，改為每 3–6 個月。`,citation:{table:`表九 臨床監測項目與建議頻率`,pdfPage:18},patientFacing:!0},{id:`interval-kidney`,typeGate:`type2-confirmed`,category:`screening-interval`,appliesTo:`糖尿病人`,statement:`肌酸酐、eGFR、尿液常規與白蛋白尿建議每年檢查一次；異常需追蹤者改為每 3–6 個月。`,citation:{table:`表九 臨床監測項目與建議頻率`,pdfPage:18},patientFacing:!0},{id:`interval-eye`,typeGate:`type2-confirmed`,category:`screening-interval`,appliesTo:`糖尿病人`,statement:`視力與眼底檢查建議每年一次。`,citation:{table:`表九 臨床監測項目與建議頻率`,pdfPage:18},patientFacing:!0},{id:`interval-foot`,category:`screening-interval`,appliesTo:`糖尿病人`,statement:`足部脈搏與踝臂動脈收縮壓比值建議每年檢查一次。`,patientStatement:`建議每年檢查一次腳的血液循環。`,citation:{table:`表九 臨床監測項目與建議頻率`,pdfPage:18},patientFacing:!0},{id:`interval-neuropathy`,typeGate:`type2-confirmed`,category:`screening-interval`,appliesTo:`糖尿病人`,statement:`神經病變評估（單股纖維壓覺、128 Hz 音叉震動感、肌腱反射）建議每年一次。`,patientStatement:`建議每年做一次足部感覺檢查。`,citation:{table:`表九 臨床監測項目與建議頻率`,pdfPage:18},patientFacing:!0},{id:`interval-oral`,category:`screening-interval`,appliesTo:`糖尿病人`,statement:`口腔檢查建議每年一次。`,citation:{table:`表九 臨床監測項目與建議頻率`,pdfPage:18},patientFacing:!0},{id:`interval-self-management`,category:`screening-interval`,appliesTo:`糖尿病人`,statement:`體重、血壓、血糖與足部的自我管理需經常進行。`,citation:{table:`表九 臨床監測項目與建議頻率`,pdfPage:18},patientFacing:!0},{id:`interval-retina-followup`,category:`screening-interval`,appliesTo:`已完成眼底檢查者`,statement:`眼底沒有變化或僅輕微變化時每年一次；比上次檢查惡化時每 3–6 個月一次；懷孕時需更頻繁追蹤。`,citation:{table:`表九 註 4`,pdfPage:18},patientFacing:!0},{id:`screening-adult`,category:`screening-interval`,appliesTo:`40 歲以上一般民眾`,statement:`40–64 歲建議每 3 年篩檢一次糖尿病，65 歲以上建議每年篩檢一次。`,citation:{section:`第五章 糖尿病人的篩檢`,pdfPage:49},patientFacing:!0},{id:`referral-nephrology`,category:`referral-urgency`,appliesTo:`eGFR 低於 30，或腎病病因不明、貧血、次發性副甲狀腺功能過高症、代謝性骨疾病、頑抗性高血壓、電解質不平衡`,statement:`建議轉介腎臟專科醫師，以增進醫療照護品質並延緩透析時機。`,citation:{section:`糖尿病腎臟疾病－轉介腎臟專科醫師`,pdfPage:199},patientFacing:!1},{id:`referral-eye-sameday`,category:`referral-urgency`,appliesTo:`突發性視力喪失或視網膜剝離徵象`,statement:`當天轉診眼科專科醫師。`,citation:{table:`表九 註 4`,pdfPage:18},patientFacing:!0},{id:`referral-eye-week`,category:`referral-urgency`,appliesTo:`視網膜前或玻璃體出血、新生血管、虹膜炎`,statement:`一週內轉診眼科專科醫師。`,citation:{table:`表九 註 4`,pdfPage:18},patientFacing:!0},{id:`referral-eye-months`,category:`referral-urgency`,appliesTo:`重度視網膜病變、無法解釋的視力衰退、黃斑部水腫、白內障或無法看見眼底`,statement:`1–2 個月內轉診眼科專科醫師。`,citation:{table:`表九 註 4`,pdfPage:18},patientFacing:!0},{id:`referral-foot`,category:`referral-urgency`,appliesTo:`有足部潰瘍或感染`,statement:`轉診至足部照護團隊。`,citation:{table:`表九 註 5`,pdfPage:18},patientFacing:!0},{id:`t1-hba1c-general`,targetValue:`低於 7.0%。`,category:`glycemic-target`,appliesTo:`第 1 型糖尿病，大部分病人`,statement:`糖化血色素控制目標為低於 7.0%，對大部分病人是合理的目標。`,patientStatement:`糖化血色素建議控制在 7.0% 以下。實際目標會依您的病程、低血糖經驗與其他疾病調整，請以醫療團隊為您訂的數字為準。`,citation:{source:`t1-2022`,section:`第五章 血糖治療目標（臨床建議表）`,pdfPage:67},patientFacing:!0,typeGate:`type1-confirmed`},{id:`t1-hba1c-hypo-unaware`,targetValue:`放寬為低於 7.5%。`,category:`glycemic-target`,appliesTo:`第 1 型糖尿病，無法清楚表達低血糖症狀、低血糖無感、無法接受胰島素類似物治療或無法規則自我監測血糖`,statement:`糖化血色素目標放寬為低於 7.5%。`,citation:{source:`t1-2022`,section:`第五章 血糖治療目標`,pdfPage:67},patientFacing:!0,typeGate:`type1-confirmed`},{id:`t1-hba1c-severe-hypo`,targetValue:`放寬為低於 8.0%。`,category:`glycemic-target`,appliesTo:`第 1 型糖尿病，過去有嚴重低血糖病史、預期壽命受限，或嚴格治療的害處明顯大於好處`,statement:`糖化血色素目標放寬為低於 8.0%。`,citation:{source:`t1-2022`,section:`第五章 血糖治療目標`,pdfPage:68},patientFacing:!0,typeGate:`type1-confirmed`},{id:`t1-fpg-adult`,targetValue:`80–130 mg/dL。`,category:`glycemic-target`,appliesTo:`第 1 型糖尿病成人`,statement:`空腹血糖控制目標為 80–130 mg/dL。`,citation:{source:`t1-2022`,section:`第五章 血糖治療目標`,pdfPage:70},patientFacing:!0,typeGate:`type1-confirmed`},{id:`t1-ppg-adult`,targetValue:`低於 180 mg/dL。`,category:`glycemic-target`,appliesTo:`第 1 型糖尿病成人`,statement:`餐後血糖控制目標為低於 180 mg/dL，測量時機為餐後 1–2 小時。`,citation:{source:`t1-2022`,section:`第五章 血糖治療目標`,pdfPage:70},patientFacing:!0,typeGate:`type1-confirmed`},{id:`t1-glucose-youth`,targetValue:`飯前 90–130 mg/dL、飯後 90–180 mg/dL、睡前 90–150 mg/dL。`,category:`glycemic-target`,appliesTo:`第 1 型糖尿病兒童與青少年`,statement:`飯前血糖 90–130 mg/dL、飯後血糖 90–180 mg/dL、睡前血糖 90–150 mg/dL 為合理目標。`,citation:{source:`t1-2022`,section:`第五章 血糖治療目標`,pdfPage:68},patientFacing:!0,typeGate:`type1-confirmed`},{id:`t1-interval-hba1c`,category:`screening-interval`,appliesTo:`第 1 型糖尿病`,statement:`控制穩定且達標者一年至少監測 2 次糖化血色素；近期改變治療方式或未達控制目標者一年至少 4 次。`,patientStatement:`糖化血色素建議一年至少檢查 2 次；如果最近換了治療方式或還沒達到目標，建議一年 4 次。`,citation:{source:`t1-2022`,section:`第五章 血糖治療目標`,pdfPage:67},patientFacing:!0,typeGate:`type1-confirmed`},{id:`t1-bp-target-general`,targetValue:`收縮壓低於 140 mmHg、舒張壓低於 90 mmHg。`,category:`bp-target`,appliesTo:`第 1 型糖尿病合併高血壓`,statement:`收縮壓控制於 140 mmHg 以下、舒張壓控制於 90 mmHg 以下。`,citation:{source:`t1-2022`,section:`第九章 高血壓藥物控制及目標`,pdfPage:162},patientFacing:!0,typeGate:`type1-confirmed`},{id:`t1-bp-target-intensive`,targetValue:`低於 130/80 mmHg。`,category:`bp-target`,appliesTo:`第 1 型糖尿病合併心血管疾病或蛋白尿`,statement:`血壓控制於 130/80 mmHg 以下；合併心血管疾病可達到次級預防，合併蛋白尿可延緩腎病變的發生和惡化。`,citation:{source:`t1-2022`,section:`第九章 高血壓藥物控制及目標`,pdfPage:162},patientFacing:!0,typeGate:`type1-confirmed`},{id:`t1-interval-lipid-adult`,category:`screening-interval`,appliesTo:`第 1 型糖尿病成人`,statement:`每年至少接受 1 次血脂檢查，包括總膽固醇、低密度脂蛋白膽固醇、高密度脂蛋白膽固醇與三酸甘油酯。`,citation:{source:`t1-2022`,section:`第九章 血脂異常的控制及目標`,pdfPage:168},patientFacing:!0,typeGate:`type1-confirmed`},{id:`t1-interval-kidney`,category:`screening-interval`,appliesTo:`第 1 型糖尿病，發病滿 5 年以上`,statement:`發病滿 5 年以上者，應於青春期或大於 10 歲時開始，每年檢驗早晨尿液白蛋白／肌酸酐比值（UACR）。`,patientStatement:`糖尿病滿 5 年之後，建議每年檢查一次早晨尿液的白蛋白／肌酸酐比值。`,citation:{source:`t1-2022`,section:`第十章 糖尿病腎臟疾病`,pdfPage:198},patientFacing:!0,typeGate:`type1-confirmed`},{id:`t1-kidney-twice-yearly`,category:`screening-interval`,appliesTo:`第 1 型糖尿病，UACR 大於 300 mg/g 或 eGFR 介於 30–60 mL/min/1.73m²`,statement:`應每年至少檢驗兩次 UACR。`,citation:{source:`t1-2022`,section:`第十章 糖尿病腎臟疾病`,pdfPage:199},patientFacing:!0,typeGate:`type1-confirmed`},{id:`t1-referral-nephrology`,category:`referral-urgency`,appliesTo:`第 1 型糖尿病，eGFR 低於 30 mL/min/1.73m²、原因不明的腎臟病，或難以控制／快速惡化的腎功能`,statement:`應即時轉介腎臟科醫師評估。`,citation:{source:`t1-2022`,section:`第十章 糖尿病腎臟疾病`,pdfPage:199},patientFacing:!1,typeGate:`type1-confirmed`},{id:`t1-interval-eye`,category:`screening-interval`,appliesTo:`第 1 型糖尿病`,statement:`第 1 型糖尿病人於 11 歲以上診斷後 2 年，或 9 歲診斷後 5 年，應接受初次完整的眼科檢查（含散瞳），之後依建議安排追蹤。`,patientStatement:`第 1 型糖尿病的第一次完整眼睛檢查（含散瞳），11 歲以上診斷的人建議在診斷後 2 年完成，9 歲診斷的人建議在診斷後 5 年完成，之後定期追蹤。`,citation:{source:`t1-2022`,section:`第十章 視網膜病變`,pdfPage:186},patientFacing:!0,typeGate:`type1-confirmed`},{id:`t1-referral-eye-vision`,category:`referral-urgency`,appliesTo:`第 1 型糖尿病，矯正視力低於 0.5（20/40）或自覺視力變化`,statement:`應轉介眼科醫師。`,citation:{source:`t1-2022`,section:`第十章 視網膜病變`,pdfPage:186},patientFacing:!0,typeGate:`type1-confirmed`},{id:`t1-interval-neuropathy`,category:`screening-interval`,appliesTo:`第 1 型糖尿病`,statement:`第 1 型糖尿病人應於罹病後 2–5 年、青春期或年齡大於 10 歲時開始，每年接受完整的神經病變篩檢。`,patientStatement:`第 1 型糖尿病建議在罹病 2 到 5 年後、或滿 10 歲之後開始，每年做一次完整的神經檢查。`,citation:{source:`t1-2022`,section:`第十章 神經病變`,pdfPage:214},patientFacing:!0,typeGate:`type1-confirmed`}],D=new Map(E.map(e=>[e.id,e]));function O(e){let t=e.citation.table??e.citation.section??``;return`${T[e.citation.source??`t2-2022`]}${t?`，${t}`:``}（PDF 第 ${e.citation.pdfPage} 頁）`}function k(e){let t=e.citation.table??e.citation.section??``;return`${e.citation.source===`t1-2022`?`第1型指引，`:``}${t?`${t}，`:``}p.${e.citation.pdfPage}`}var te=`draft-0.2`,ne=[{id:`SC-MONITOR`,behavior:`monitoring`,title:`掌握自己的數字`,core:!0,appliesWhen:`每份報告固定納入。`,patientText:`知道自己的數字，回診時才問得出重點。

1. 記下最近一次的糖化血色素、血壓、血脂與腎功能結果和日期。
2. 若醫療團隊建議在家測血糖，記錄時間點（空腹、飯後或睡前）與數值，回診時帶去。
3. 量血壓前先坐著休息五分鐘，手臂與心臟同高，每天固定時間量。
4. 不要只看單一次數字，一段時間的變化更能反映真實狀況。`},{id:`SC-MEDS`,behavior:`taking-medication`,title:`把藥用對、用得安全`,core:!0,appliesWhen:`每份報告固定納入。`,patientText:`規律用藥是控制糖尿病最直接的一環，任何調整都應由醫師決定。

1. 依醫師指示的時間與劑量服藥。常忘記可用藥盒或手機提醒。
2. 服藥後不舒服先聯絡醫療團隊或藥師，不要自行停藥、減藥或換藥。
3. 看診、看牙、到藥局時出示目前所有藥品清單，包含中草藥、保健食品與他院的藥。
4. 不要自行購買來路不明的藥品、偏方，或宣稱可取代處方的產品。`},{id:`SC-EAT`,behavior:`healthy-eating`,title:`吃得穩定，不必吃得痛苦`,core:!0,appliesWhen:`每份報告固定納入。`,patientText:`糖尿病的飲食不是不能吃，而是讓份量與時間穩定下來。

1. 三餐時間固定，不要為了控制血糖跳過正餐。
2. 主食（飯、麵、麵包、根莖類、水果）最影響血糖，份量比種類重要，可請營養師協助換算。
3. 每餐先吃蔬菜與蛋白質、再吃主食，血糖上升較慢。
4. 含糖飲料最容易被忽略：手搖飲、罐裝飲料、運動飲料。改喝白開水或無糖茶最快見效。
5. 若同時有腎臟或心臟問題，鹽分、蛋白質與水分的限制需要依個人狀況設計，不要自行套用網路上的飲食法。`,definiteVariants:[{when:`kidney-or-heart`,from:`5. 若同時有腎臟或心臟問題，鹽分、蛋白質與水分的限制需要依個人狀況設計，不要自行套用網路上的飲食法。`,to:`5. 您的資料顯示已有腎臟或心臟方面的狀況，鹽分、蛋白質與水分的份量需要由營養師與醫療團隊為您個別設計，不要自行套用網路上的飲食法。`}]},{id:`SC-ACTIVE`,behavior:`being-active`,title:`動起來，從做得到的強度開始`,core:!0,appliesWhen:`每份報告固定納入。`,patientText:`規律活動能同時改善血糖、血壓與血脂，重點是能持續。

1. 從現在做得到的強度開始逐步增加，走路最容易持續。每坐約一小時起來動幾分鐘。
2. 活動時若胸悶、胸痛、明顯喘不過氣、頭暈或冒冷汗，立即停止並儘速就醫。
3. 已有足部傷口、視網膜病變、心臟疾病或平衡問題者，開始新運動前先與醫療團隊討論。`},{id:`SC-RISK-REDUCE`,behavior:`reducing-risks`,title:`疫苗與口腔`,core:!0,appliesWhen:`每份報告固定納入。`,patientText:`1. 依醫療團隊建議接種疫苗。
2. 維持口腔清潔並定期洗牙。牙周發炎與血糖控制會互相影響。`},{id:`SC-HYPO`,behavior:`problem-solving`,title:`認識低血糖並知道怎麼處理`,core:!1,appliesWhen:`資料中有胰島素或促胰島素分泌劑（如 sulfonylurea、glinide）的申報紀錄時納入。`,patientText:`某些糖尿病藥物可能造成低血糖，事先知道怎麼處理就不會慌張。

1. 常見症狀：發抖、冒冷汗、心悸、飢餓感、頭暈、視線模糊、注意力不集中、突然情緒改變。
2. 懷疑低血糖時先測血糖，無法測量就先當作低血糖處理。
3. 立即補充約 15 公克醣類（半杯果汁、含糖飲料或方糖），15 分鐘後再測，仍偏低可再補充一次。症狀改善後若距下一餐還久，再吃一份含澱粉點心。
4. 隨身攜帶糖果或含糖飲料，並讓家人、同事知道該怎麼幫您。`,urgentSigns:`低血糖時出現意識不清、抽搐或無法自行吞嚥：旁人不可強行餵食，請立即撥打 119。`},{id:`SC-SICKDAY`,behavior:`problem-solving`,title:`生病或使用類固醇期間的照護`,core:!1,appliesWhen:`資料中有全身性類固醇的申報紀錄，或年齡 65 歲以上，或已發生併發症項目較多時納入。`,patientText:`感染、發燒或使用類固醇期間，血糖可能明顯上升。

1. 生病期間不要自行停用糖尿病藥物，除非醫師另有指示。
2. 這段期間血糖可能比平常高，若醫療團隊有教您自我監測，建議增加測量頻率。
3. 注意補充水分。發燒、腹瀉或嘔吐時特別容易脫水。
4. 使用類固醇期間血糖上升是常見反應，停藥後可能回降。用藥前後請主動告知糖尿病照護團隊。`,definiteVariants:[{when:`sick-day-hold-drugs`,from:`1. 生病期間不要自行停用糖尿病藥物，除非醫師另有指示。`,to:`1. 生病期間不要自行停用糖尿病藥物，除非醫師另有指示。
2. 您使用的藥物中，有些在發燒、嚴重腹瀉嘔吐或無法進食而脫水時可能需要暫停。請事先和醫療團隊確認「哪幾種要停、什麼情況停、什麼時候恢復」，把答案記下來備用，不要等生病當下才問。`},{when:`sglt2`,from:`3. 注意補充水分。發燒、腹瀉或嘔吐時特別容易脫水。`,to:`3. 注意補充水分並保持會陰部清潔。您使用的藥物中有一類會讓糖分從尿液排出，較容易發生泌尿道或生殖器感染。
4. 特別注意：這類藥物在少數情況下，即使血糖不高也可能發生酮酸中毒。若出現持續噁心嘔吐、腹痛、呼吸變喘或呼氣有水果味，即使血糖看起來正常也要儘速就醫。`}],urgentSigns:`生病期間持續嘔吐無法進食、血糖持續偏高不下、呼吸變喘、意識改變或明顯脫水：儘速就醫。`},{id:`SC-COPING`,behavior:`healthy-coping`,title:`照顧情緒也是照顧糖尿病`,core:!1,appliesWhen:`已發生併發症較多或整體疾病負擔較高時納入。`,patientText:`長期管理慢性病本來就累，情緒低落或倦怠並不代表您做得不好。

1. 覺得疲乏、沮喪或對自我照護失去動力，是常見且可以被協助的狀況，不是意志力的問題。
2. 一次只調整一件事。設定小而具體的目標，比一次改變全部更容易持續。
3. 讓家人或朋友知道您正在做的事，需要時請他們協助提醒或陪同回診。
4. 若情緒低落持續超過兩週、影響睡眠或日常生活，請主動告訴醫療團隊，可安排進一步評估與轉介。`,urgentSigns:`若出現傷害自己的念頭：請立即告訴身邊的人並尋求協助，或撥打 1925 安心專線。`}],re=new Map(ne.map(e=>[e.id,e]));function ie(e,t,n=null){let r={},i=[];for(let e of ne)e.core&&(i.push(e.id),r[e.id]=`核心自我照護模組，固定納入。`);let a=e.medicationClasses.map(e=>e.atcClass).join(` `),o=/胰島素|insulin|磺醯脲|sulfonyl|glinide|瑞格列|格列/i.test(a),s=n!==null&&n<70;(o||s)&&(i.push(`SC-HYPO`),r[`SC-HYPO`]=[s?`資料中實測血糖最低 ${n} mg/dL，低於 70`:``,o?`申報用藥分類中出現胰島素或促胰島素分泌劑`:``].filter(Boolean).join(`；`)+`，需納入低血糖處理。`);let c=/腎上腺素|類固醇|corticoster|prednis|dexameth/i.test(a),l=e.medicationIngredients.join(` `),u=/metformin|雙胍|gliflozin/i.test(l),d=e.ageYears.known?e.ageYears.value:null,f=t;(c||u||d!==null&&d>=65||f>=3)&&(i.push(`SC-SICKDAY`),r[`SC-SICKDAY`]=[c?`申報用藥分類中出現全身性類固醇`:``,d!==null&&d>=65?`年齡 ${d} 歲`:``,u?`申報用藥含生病期間可能需要暫停的類別（metformin 或 SGLT2 抑制劑）`:``,f>=3?`已發生併發症 ${f} 項`:``].filter(Boolean).join(`；`)+`。`);let p=e.dcsiTotal.known?e.dcsiTotal.value:null;return(p!==null&&p>=4||f>=3)&&(i.push(`SC-COPING`),r[`SC-COPING`]=`疾病負擔較高（DCSI ${p??`未知`}，已發生併發症 ${f} 項）。`),{moduleIds:i,reasons:r}}var A=[{id:`SHARED-TARGETS`,title:`血糖、血壓與血脂`,appliesWhen:`always`,text:`這三項會一起影響眼睛、腎臟、神經、心臟與腦部的血管，只顧血糖不夠。每個人的目標會依年齡、共病與用藥調整，依醫療團隊訂的目標控制即可，不必和別人比較數字。`},{id:`SHARED-FOOT`,title:`每天花一分鐘照顧雙腳`,appliesWhen:`foot`,text:`1. 每天查看腳背、腳底、腳趾縫與腳跟，看不到腳底可用鏡子或請家人協助。留意水泡、破皮、裂傷、紅腫、變色、滲液、異味、厚繭或指甲周圍發炎。
2. 每天以溫水清潔並擦乾，尤其腳趾縫。水溫先用手肘確認，不要用熱水袋、電毯或暖暖包熱敷足部。
3. 不赤腳走路，也不要只穿襪子或薄底拖鞋。穿鞋前先摸鞋內是否有砂石、破損或凸起物。
4. 不要自行剪除厚繭、雞眼，也不要在傷口上使用來路不明的藥膏或偏方。`},{id:`SHARED-SMOKING`,title:`關於吸菸`,appliesWhen:`smoking`,text:`吸菸會同時傷害眼底、腎臟與全身大小血管，戒菸是對血管保護效益最大的一件事。可請醫療團隊轉介戒菸服務，或撥打戒菸專線。`}],ae=new Map(A.map(e=>[e.id,e])),oe={1:[`interval-eye`,`interval-retina-followup`],2:[],3:[`interval-kidney`,`kidney-intensive-followup`],4:[`interval-neuropathy`],5:[`interval-lipid`],6:[`interval-foot`]},se={"interval-hba1c":`t1-interval-hba1c`,"interval-kidney":`t1-interval-kidney`,"interval-eye":`t1-interval-eye`,"interval-neuropathy":`t1-interval-neuropathy`,"interval-lipid":`t1-interval-lipid-adult`,"kidney-intensive-followup":`t1-kidney-twice-yearly`},ce=[`interval-hba1c`,`interval-lipid`,`interval-kidney`,`interval-oral`];function le(e,t={}){let n=new Set(ce);for(let t of e)for(let e of oe[t]??[])n.add(e);if(t.kidneyIntensive||n.delete(`kidney-intensive-followup`),n.has(`kidney-intensive-followup`)&&n.delete(`interval-kidney`),n.has(`interval-retina-followup`)&&n.delete(`interval-eye`),t.type1)for(let[e,t]of Object.entries(se))n.delete(e)&&n.add(t);let r=Object.keys(ue),i=E.filter(e=>n.has(e.id)&&e.patientFacing).sort((e,t)=>r.indexOf(e.id)-r.indexOf(t.id));return i.length?{rules:i,text:de(i)}:{rules:[],text:``}}var ue={"interval-hba1c":`血糖控制指標`,"t1-interval-hba1c":`血糖控制指標`,"interval-lipid":`血脂`,"t1-interval-lipid-adult":`血脂`,"interval-kidney":`腎功能與尿液檢查`,"t1-interval-kidney":`腎功能與尿液檢查`,"kidney-intensive-followup":`腎功能與尿液檢查（您的檢查結果顯示需要加強追蹤）`,"t1-kidney-twice-yearly":`腎功能與尿液檢查（您的檢查結果顯示需要加強追蹤）`,"interval-eye":`眼底`,"t1-interval-eye":`眼底`,"interval-retina-followup":`眼底檢查`,"interval-neuropathy":`神經與足部感覺`,"t1-interval-neuropathy":`神經與足部感覺`,"interval-foot":`足部循環`,"interval-oral":`口腔`};function de(e){return e.length?`${e.map((e,t)=>`${t+1}. ${ue[e.id]??``}：${e.patientStatement??e.statement}`).join(`
`)}

實際的檢查時間由醫療團隊依您的狀況安排，上面是一般的參考間隔。`:``}var fe={"kidney-intensive-followup":`腎功能與尿液白蛋白`};function pe(e){return e.map(e=>{let t=fe[e.id];return`  ${t?`${t}：`:``}${e.statement}　〔${k(e)}〕`})}var me=[{id:`education`,label:`衛教模組 ${x}`},{id:`selfCare`,label:`自我照護模組 ${te}`},{id:`rules`,label:`指引門檻表 ${w}`}];function he({approved:e}){return(0,a.jsx)(`span`,{className:e?`libraryBadge libraryBadgeOk`:`libraryBadge libraryBadgeDraft`,children:e?`已核准`:`DRAFT・未經醫療團隊核准`})}function j({text:e}){return(0,a.jsx)(a.Fragment,{children:e.split(/\n{2,}/).map((e,t)=>(0,a.jsx)(`p`,{className:`libraryBody`,children:e},t))})}function ge(){return(0,a.jsxs)(a.Fragment,{children:[(0,a.jsx)(`p`,{className:`fieldNote`,children:`病人版報告的併發症段落只會用到這裡的文字，模型不改寫。 主題模組只留該疾病特有的內容；每份報告都講一次的通用內容集中在下方的共同區塊。`}),S.map(e=>(0,a.jsxs)(`article`,{className:`libraryItem`,children:[(0,a.jsxs)(`header`,{className:`libraryItemHead`,children:[(0,a.jsx)(`h3`,{children:e.title}),(0,a.jsx)(`code`,{children:e.id}),(0,a.jsx)(`span`,{className:`libraryTag`,children:f[e.topic]}),e.typeGate===`any`?null:(0,a.jsx)(`span`,{className:`libraryTag`,children:p[e.typeGate]}),e.autoOnly?(0,a.jsx)(`span`,{className:`libraryTag`,children:`程式自動加入`}):null]}),(0,a.jsxs)(`p`,{className:`libraryMeta`,children:[`納入條件：`,e.appliesWhen]}),(0,a.jsx)(j,{text:e.patientText}),e.urgentSigns?(0,a.jsxs)(`p`,{className:`libraryUrgent`,children:[(0,a.jsx)(`strong`,{children:`就醫警訊`}),e.urgentSigns]}):null]},e.id)),(0,a.jsx)(`h3`,{className:`librarySubhead`,children:`共同區塊（整份報告各出現一次）`}),A.map(e=>(0,a.jsxs)(`article`,{className:`libraryItem`,children:[(0,a.jsxs)(`header`,{className:`libraryItemHead`,children:[(0,a.jsx)(`h3`,{children:e.title}),(0,a.jsx)(`code`,{children:e.id}),(0,a.jsx)(`span`,{className:`libraryTag`,children:e.appliesWhen===`always`?`固定納入`:`由主題觸發：${e.appliesWhen}`})]}),(0,a.jsx)(j,{text:e.text})]},e.id))]})}function _e(){return(0,a.jsxs)(a.Fragment,{children:[(0,a.jsx)(`p`,{className:`fieldNote`,children:`以 DSMES／ADCES7 七項自我照護行為為骨架。臨床照護指引不是為這些行為寫的， 所以這些文字不引指引，需由醫療團隊依院內衛教單張核定。`}),ne.map(e=>(0,a.jsxs)(`article`,{className:`libraryItem`,children:[(0,a.jsxs)(`header`,{className:`libraryItemHead`,children:[(0,a.jsx)(`h3`,{children:e.title}),(0,a.jsx)(`code`,{children:e.id}),(0,a.jsx)(`span`,{className:`libraryTag`,children:m[e.behavior]??e.behavior}),e.core?(0,a.jsx)(`span`,{className:`libraryTag`,children:`固定納入`}):null]}),(0,a.jsxs)(`p`,{className:`libraryMeta`,children:[`納入條件：`,e.appliesWhen]}),(0,a.jsx)(j,{text:e.patientText}),e.definiteVariants?.length?(0,a.jsxs)(`div`,{className:`libraryVariants`,children:[(0,a.jsx)(`strong`,{children:`整句替換（兩句擇一，不會同時出現）`}),(0,a.jsx)(`p`,{className:`libraryVariantHint`,children:`正文寫成「若…」是因為要能給所有人看。程式已從資料確認這位病人符合下列條件時，那一句改用直述句。`}),e.definiteVariants.map((e,t)=>(0,a.jsxs)(`div`,{className:`libraryVariant`,children:[(0,a.jsx)(`p`,{className:`libraryVariantWhen`,children:(0,a.jsx)(`span`,{className:`libraryTag`,children:h[e.when]??e.when})}),(0,a.jsxs)(`p`,{className:`libraryVariantLine`,children:[(0,a.jsx)(`span`,{className:`libraryVariantSide`,children:`未確認時`}),(0,a.jsx)(`span`,{className:`libraryVariantFrom`,children:e.from})]}),(0,a.jsxs)(`p`,{className:`libraryVariantLine`,children:[(0,a.jsx)(`span`,{className:`libraryVariantSide libraryVariantSideOn`,children:`已確認時`}),(0,a.jsx)(`span`,{className:`libraryVariantTo`,children:e.to})]})]},t))]}):null,e.urgentSigns?(0,a.jsxs)(`p`,{className:`libraryUrgent`,children:[(0,a.jsx)(`strong`,{children:`就醫警訊`}),e.urgentSigns]}):null]},e.id))]})}function ve(){let e=[..._,...E.map(e=>e.category).filter(e=>!_.includes(e))].filter((e,t,n)=>n.indexOf(e)===t).map(e=>({category:e,rules:E.filter(t=>t.category===e)})).filter(e=>e.rules.length>0);return(0,a.jsxs)(a.Fragment,{children:[(0,a.jsxs)(`p`,{className:`fieldNote`,children:[`來源兩份：`,T[`t2-2022`],`與`,T[`t1-2022`],`。 這裡記錄的是門檻數值、追蹤間隔與轉診急迫度等事實，以自己的文字陳述並附出處，不重製指引原文。 頁次指各自的 PDF 實體頁次，可直接跳頁核對。共 `,E.length,` 條，其中`,` `,E.filter(e=>e.typeGate===`type1-confirmed`).length,` 條為第 1 型專用、`,E.filter(e=>e.typeGate===`type2-confirmed`).length,` 條為第 2 型專用， 其餘兩型皆適用。兩型的數字有實際差異——餐後血糖第 2 型是 80–160 mg/dL，第 1 型成人是低於 180 mg/dL。`]}),e.map(e=>(0,a.jsxs)(`section`,{className:`libraryGroup`,children:[(0,a.jsxs)(`h3`,{className:`librarySubhead`,children:[g[e.category]??e.category,(0,a.jsx)(`span`,{className:`libraryCount`,children:e.rules.length})]}),(0,a.jsx)(`div`,{className:`libraryTableWrap`,children:(0,a.jsxs)(`table`,{className:`libraryTable`,children:[(0,a.jsx)(`thead`,{children:(0,a.jsxs)(`tr`,{children:[(0,a.jsx)(`th`,{children:`適用對象`}),(0,a.jsx)(`th`,{children:`門檻／間隔（醫師版用字）`}),(0,a.jsx)(`th`,{children:`病人版用字`}),(0,a.jsx)(`th`,{children:`出處`})]})}),(0,a.jsx)(`tbody`,{children:e.rules.map(e=>(0,a.jsxs)(`tr`,{children:[(0,a.jsxs)(`td`,{children:[(0,a.jsx)(`code`,{children:e.id}),e.typeGate&&e.typeGate!==`any`?(0,a.jsx)(`span`,{className:`libraryTag`,children:e.typeGate===`type1-confirmed`?`第 1 型專用`:`第 2 型專用`}):null,(0,a.jsx)(`span`,{children:e.appliesTo})]}),(0,a.jsx)(`td`,{children:e.statement}),(0,a.jsx)(`td`,{children:e.patientFacing?e.patientStatement??e.statement:(0,a.jsx)(`span`,{className:`libraryMuted`,children:`不對病人顯示`})}),(0,a.jsx)(`td`,{className:`libraryCitation`,children:k(e)})]},e.id))})]})})]},e.category))]})}function ye(){let[e,t]=(0,r.useState)(`education`);return(0,a.jsxs)(`article`,{className:`stepCard`,children:[(0,a.jsxs)(`div`,{className:`stepHeading`,children:[(0,a.jsx)(`span`,{className:`stepNumber`,children:`05`}),(0,a.jsxs)(`div`,{className:`stepHeadingText`,children:[(0,a.jsx)(`p`,{className:`eyebrow`,children:`CONTENT`}),(0,a.jsx)(`h2`,{children:`報告會用到的固定內容`}),(0,a.jsx)(`p`,{className:`fieldNote`,children:`唯讀。併發症風險與預防叮嚀的每一句都出自這裡，模型不改寫；觀察摘要、短期建議、中期目標三段則由模型撰寫。 內容改動走版本控制與送審，不在頁面上編輯。`})]})]}),(0,a.jsxs)(`div`,{className:`stepBody`,children:[(0,a.jsx)(`div`,{className:`pipeMap`,children:(0,a.jsx)(d,{highlight:u.contentLibrary,compact:!0})}),(0,a.jsx)(`div`,{className:`tabs`,children:me.map(n=>(0,a.jsx)(`button`,{type:`button`,className:e===n.id?`active`:``,onClick:()=>t(n.id),children:n.label},n.id))}),(0,a.jsx)(`p`,{className:`libraryStatus`,children:(0,a.jsx)(he,{approved:!1})}),(0,a.jsxs)(`div`,{className:`libraryScroll`,children:[e===`education`?(0,a.jsx)(ge,{}):null,e===`selfCare`?(0,a.jsx)(_e,{}):null,e===`rules`?(0,a.jsx)(ve,{}):null]})]})]})}function be(e){let t=[];return e.rValue!==null&&t.push(`R${e.topic}=${e.rValue}`),e.prValue!==null&&t.push(`PR${e.topic}=${e.prValue}`),t.length?t.join(`　`):`R${e.topic}／PR${e.topic} 皆缺值`}function M(e){return C.get(e)?.title??re.get(e)?.title??ae.get(e)?.title??e}function xe(e){let t=C.get(e)?.topic;return t===`BASE`?`固定`:t===`TYPE`?`類型說明`:`主題`}function Se(e,t){let n=e?D.get(e):void 0;return n?k(n):t}function N({n:e,title:t,note:n,count:r,children:i}){return(0,a.jsxs)(`section`,{className:`traceStage`,children:[(0,a.jsxs)(`header`,{className:`traceStageHead`,children:[(0,a.jsx)(`span`,{className:`traceStep`,children:e}),(0,a.jsx)(`h4`,{children:t}),r?(0,a.jsx)(`span`,{className:`traceCount`,children:r}):null]}),n?(0,a.jsx)(`p`,{className:`traceNote`,children:n}):null,i]})}function Ce({plan:e,facts:t}){let n=e.targets.targets.filter(e=>e.value),r=e.patientModuleIds;return(0,a.jsxs)(`div`,{className:`traceBoard`,children:[(0,a.jsx)(`p`,{className:`traceLead`,children:`以下每一段都由程式判定，不需要 API 金鑰，也不會因為換模型而改變。左邊是輸入訊號，右邊是判定結果。`}),(0,a.jsx)(N,{n:`1`,title:`併發症主題：R／PR → 納入方式`,note:`同一個主題，來源只會給 R 或 PR 其中一個。給了 R 代表已發生；只給 PR 代表尚未發生，才會有風險預測。`,count:`${e.decisions.filter(e=>e.kind!==`excluded`).length}／${e.decisions.length} 納入`,children:(0,a.jsx)(`ul`,{className:`traceRows`,children:e.decisions.map(e=>(0,a.jsxs)(`li`,{className:e.kind===`excluded`?`traceRow traceRowOff`:`traceRow`,children:[(0,a.jsx)(`span`,{className:`traceSignal`,children:be(e)}),(0,a.jsx)(`span`,{className:`traceArrow`,children:`→`}),(0,a.jsx)(`span`,{className:y[e.kind],children:v[e.kind]}),(0,a.jsx)(`span`,{className:`traceSubject`,children:e.topicName}),(0,a.jsx)(`p`,{className:`traceReason`,children:e.reason})]},e.topic))})}),(0,a.jsxs)(N,{n:`2`,title:`依指引推導的目標`,note:`目標值來自門檻表，不是模型生成的。括號內是可回查的章表與頁次。`,count:`${n.length} 項`,children:[n.length?(0,a.jsx)(`ul`,{className:`traceRows`,children:n.map(e=>(0,a.jsxs)(`li`,{className:`traceRow`,children:[(0,a.jsx)(`span`,{className:`traceSignal`,children:e.metric}),(0,a.jsx)(`span`,{className:`traceArrow`,children:`→`}),(0,a.jsx)(`span`,{className:`traceValue`,children:e.value}),Se(e.ruleId,e.citation)?(0,a.jsx)(`span`,{className:`traceCitation`,children:Se(e.ruleId,e.citation)}):null,(0,a.jsx)(`p`,{className:`traceReason`,children:e.reason})]},e.metric))}):(0,a.jsx)(`p`,{className:`traceEmpty`,children:`沒有可解出的目標。`}),e.targets.undetermined.length?(0,a.jsx)(`ul`,{className:`traceNoteList`,children:e.targets.undetermined.map((e,t)=>(0,a.jsxs)(`li`,{children:[`資料不足、未判定：`,e]},t))}):null]}),(0,a.jsxs)(N,{n:`3`,title:`檢驗門檻判定`,note:`由實際數值觸發。這一段只做數值比對；判讀交給 LLM（下方②）。`,count:`${e.labThresholds.length} 則・已判定 ${e.evaluatedAnalytes} 項指標`,children:[e.labThresholds.length?(0,a.jsx)(`ul`,{className:`traceRows`,children:e.labThresholds.map((e,t)=>(0,a.jsxs)(`li`,{className:`traceRow`,children:[(0,a.jsx)(`span`,{className:`traceSeverity traceSeverity-${e.severity}`,children:b[e.severity]??e.severity}),(0,a.jsx)(`span`,{className:`traceArrow`,children:`→`}),(0,a.jsx)(`span`,{className:`traceValue`,children:e.clinicianMessage}),Se(e.ruleId,e.citation)?(0,a.jsx)(`span`,{className:`traceCitation`,children:Se(e.ruleId,e.citation)}):null]},`${e.code}-${t}`))}):(0,a.jsx)(`p`,{className:`traceEmpty`,children:`沒有數值達到門檻。`}),e.unevaluatedNumericItems>0?(0,a.jsxs)(`p`,{className:`traceNote`,children:[`另有 `,e.unevaluatedNumericItems,` 種有數值但未納入門檻判定的項目，會交給 LLM 判讀。`]}):null]}),(0,a.jsx)(N,{n:`4`,title:`追蹤間隔`,note:`由納入的主題決定要列哪些項目，間隔本身出自門檻表。`,count:`${e.followUp.rules.length} 項`,children:e.followUp.rules.length?(0,a.jsx)(`ul`,{className:`traceRows`,children:e.followUp.rules.map(e=>(0,a.jsxs)(`li`,{className:`traceRow`,children:[(0,a.jsx)(`span`,{className:`traceSignal`,children:e.id}),(0,a.jsx)(`span`,{className:`traceArrow`,children:`→`}),(0,a.jsx)(`span`,{className:`traceValue`,children:e.patientStatement??e.statement})]},e.id))}):(0,a.jsx)(`p`,{className:`traceEmpty`,children:`沒有適用的固定間隔。`})}),(0,a.jsx)(N,{n:`5`,title:`自我照護模組`,note:`與併發症主題無關，依用藥、低血糖紀錄與併發症數量觸發。`,count:`${e.selfCareModuleIds.length} 個`,children:(0,a.jsx)(`ul`,{className:`traceRows`,children:e.selfCareModuleIds.map(t=>(0,a.jsxs)(`li`,{className:`traceRow`,children:[(0,a.jsx)(`span`,{className:`traceSignal`,children:t}),(0,a.jsx)(`span`,{className:`traceArrow`,children:`→`}),(0,a.jsx)(`span`,{className:`traceValue`,children:M(t)}),e.selfCareReasons[t]?(0,a.jsx)(`p`,{className:`traceReason`,children:e.selfCareReasons[t]}):null]},t))})}),(0,a.jsxs)(N,{n:`6`,title:`病人版報告的段落順序`,note:`這就是組裝結果。正文逐字來自固定模組，模型不改寫。`,count:`${r.length+e.sharedBlockIds.length+e.selfCareModuleIds.length} 段`,children:[(0,a.jsxs)(`ol`,{className:`traceOutline`,children:[r.map(e=>(0,a.jsxs)(`li`,{children:[(0,a.jsx)(`span`,{className:`traceOutlineTag`,children:xe(e)}),M(e),(0,a.jsx)(`code`,{children:e})]},e)),e.sharedBlockIds.map(e=>(0,a.jsxs)(`li`,{children:[(0,a.jsx)(`span`,{className:`traceOutlineTag`,children:`共同`}),M(e),(0,a.jsx)(`code`,{children:e})]},e)),e.selfCareModuleIds.map(e=>(0,a.jsxs)(`li`,{children:[(0,a.jsx)(`span`,{className:`traceOutlineTag`,children:`自我照護`}),M(e),(0,a.jsx)(`code`,{children:e})]},`sc-${e}`))]}),e.urgentSigns.length?(0,a.jsxs)(`p`,{className:`traceNote`,children:[`另有 `,e.urgentSigns.length,` 則就醫警訊，集中放在報告開頭。`]}):null]}),(0,a.jsx)(N,{n:`→`,title:`接下來 LLM 會補的三件事`,note:`按下產出才會執行。任何一次失敗都只會少掉該段，不影響上面已經定案的內容。`,children:(0,a.jsxs)(`ul`,{className:`traceRows`,children:[(0,a.jsxs)(`li`,{className:`traceRow`,children:[(0,a.jsx)(`span`,{className:`traceLlmTag`,children:`①`}),(0,a.jsx)(`span`,{className:`traceArrow`,children:`→`}),(0,a.jsx)(`span`,{className:`traceValue`,children:`資料稽核：找資料的矛盾與需人工確認之處，改不了上面的任何判定`})]}),(0,a.jsxs)(`li`,{className:`traceRow`,children:[(0,a.jsx)(`span`,{className:`traceLlmTag`,children:`②`}),(0,a.jsx)(`span`,{className:`traceArrow`,children:`→`}),(0,a.jsxs)(`span`,{className:`traceValue`,children:[`檢驗判讀：讀原始紀錄找第 3 段沒涵蓋的異常，結果進醫師版`,t.labItems.length?`（原始紀錄 ${t.labItems.length} 筆）`:``]})]}),(0,a.jsxs)(`li`,{className:`traceRow`,children:[(0,a.jsx)(`span`,{className:`traceLlmTag`,children:`③`}),(0,a.jsx)(`span`,{className:`traceArrow`,children:`→`}),(0,a.jsx)(`span`,{className:`traceValue`,children:`檢驗敘述：寫成病人看的段落，數值會逐一比對來源後才採用`})]})]})})]})}var we=1048576;function Te(e){return e>=19968&&e<=40959||e>=13312&&e<=19903||e>=63744&&e<=64255||e>=12288&&e<=12351||e>=65280&&e<=65519}function Ee(e){let t=0,n=0,r=0,i=0,a=0;for(let o of e){a+=1;let e=o.codePointAt(0)??0;Te(e)?t+=1:e<128?o===` `||o===`	`||o===`
`||o===`\r`||o===`\f`||o===`\v`?r+=1:n+=1:i+=1}return{total:a,cjk:t,asciiVisible:n,whitespace:r,other:i}}function De(e){if(!e)return 0;let{cjk:t,asciiVisible:n,whitespace:r,other:i}=Ee(e);return Math.round(t+n/4+r/5+i/2)}function P(e){return[...e].length}function F(e){return e.toLocaleString(`zh-TW`)}var I={idle:`待命`,running:`執行中`,ok:`完成`,failed:`失敗`,skipped:`未執行`};function L({port:e}){let[t,n]=(0,r.useState)(!1),i=!e.text;return(0,a.jsxs)(`div`,{className:`pipePort`,children:[(0,a.jsxs)(`button`,{type:`button`,className:`pipePortHead`,onClick:()=>n(e=>!e),disabled:i,"aria-expanded":t,children:[(0,a.jsx)(`span`,{className:`pipePortArrow`,children:t?`▾`:`▸`}),(0,a.jsx)(`span`,{className:`pipePortLabel`,children:e.label}),(0,a.jsx)(`span`,{className:`pipePortSize`,children:i?`—`:`${F(P(e.text))} 字`})]}),t&&!i?(0,a.jsx)(`pre`,{className:e.code?`pipePortBody pipePortCode`:`pipePortBody`,children:e.text}):null]})}function R({label:e,hint:t,ports:n}){return n.length?(0,a.jsxs)(`div`,{className:`pipeGroup`,children:[(0,a.jsxs)(`p`,{className:`pipeGroupLabel`,children:[e,t?(0,a.jsx)(`span`,{children:t}):null]}),n.map(e=>(0,a.jsx)(L,{port:e},e.label))]}):null}function Oe({station:e,index:t}){return(0,a.jsxs)(`li`,{className:`pipeStation pipeStation-${e.kind} pipeState-${e.state}`,children:[(0,a.jsxs)(`div`,{className:`pipeStationHead`,children:[(0,a.jsx)(`span`,{className:`pipeIndex`,children:t}),(0,a.jsx)(`h4`,{children:e.title}),(0,a.jsx)(`span`,{className:`pipeKind`,children:e.kind===`llm`?`LLM`:`程式`}),(0,a.jsx)(`span`,{className:`pipeState pipeState-${e.state}`,children:I[e.state]})]}),(0,a.jsx)(`p`,{className:`pipeRole`,children:e.role}),u[e.id]?(0,a.jsx)(`div`,{className:`pipeMap`,children:(0,a.jsx)(d,{highlight:u[e.id],compact:!0})}):null,(0,a.jsx)(R,{label:`材料`,ports:e.inputs}),(0,a.jsx)(R,{label:`食譜`,hint:e.kind===`llm`?`system prompt 與實際執行的程式碼`:`實際執行的程式碼`,ports:e.recipe}),e.steps?.length?(0,a.jsxs)(`div`,{className:`pipeGroup`,children:[(0,a.jsxs)(`p`,{className:`pipeGroupLabel`,children:[`做了什麼`,(0,a.jsx)(`span`,{children:`依序`})]}),(0,a.jsx)(`ol`,{className:`pipeSteps`,children:e.steps.map((e,t)=>(0,a.jsx)(`li`,{children:e},t))})]}):null,(0,a.jsx)(R,{label:`成品`,ports:e.outputs}),e.problems?.length?(0,a.jsx)(`ul`,{className:`pipeProblems`,children:e.problems.map((e,t)=>(0,a.jsx)(`li`,{children:e},t))}):null]})}function ke({stations:e}){return(0,a.jsx)(`ol`,{className:`pipeBoard`,children:e.map((e,t)=>(0,a.jsx)(Oe,{station:e,index:t+1},e.id))})}var z=`/**
 * 病人資料 → LLM 好讀文字。
 *
 * 由 app/page.tsx 原樣搬出，輸出格式逐字不變（tests/lib.test.mjs 有快照斷言）。
 * 搬出的唯一目的是讓它可以被單元測試。
 */

export type JsonRecord = Record<string, unknown>;

export const USER_INPUT_ORDER = [
  "REPORT_DATE",
  "BIRTHDAY",
  "INDX_DATE",
  "SEX",
  "P4P",
  "HT",
  "HL",
  "CKD",
  "T",
  "DCSI",
  "AGEGP",
  "GRADE",
];

export const USER_INPUT_LABELS: Record<string, string> = {
  REPORT_DATE: "報告日期",
  BIRTHDAY: "出生日期",
  INDX_DATE: "糖尿病指標日期",
  SEX: "性別代碼",
  P4P: "是否參加糖尿病P4P",
  HT: "高血壓",
  HL: "高血脂",
  CKD: "慢性腎臟病",
  T: "糖尿病病程年數",
  DCSI: "DCSI總分",
  AGEGP: "年齡分組",
  GRADE: "整體分級",
};

export const SOURCE_LABELS: Record<string, string> = {
  medication: "用藥紀錄",
  labData: "檢驗資料",
  chinesemed: "中藥用藥",
  imaging: "影像資料",
  allergy: "過敏資料",
  surgery: "手術資料",
  discharge: "出院資料",
  medDays: "用藥天數資料",
  patientSummary: "病人摘要",
  cancerScreening: "癌症篩檢",
  adultHealthCheck: "成人健檢",
};

/**
 * 純計費與系統欄位，臨床判讀完全用不到，但佔掉大量 token。
 *
 * 實測五位病人：拿掉這些欄位與和成分名重複的商品名，輸入從 234,688 降到
 * 153,295 tokens（省 35%）；用藥最多的那位從 119,637 降到 61,794（省 48%）。
 *
 * order_code 刻意保留——那是尿液（06012C／06013C）與血液唯一可靠的判別依據，
 * 砍掉會讓尿糖混進血糖，那個 bug 已經出現過一次。
 */
const BILLING_ONLY_FIELDS = new Set([
  "drug_code",
  "drug_ing_code",
  "func_seq_no",
  "fee_ym",
  "drug_multi_mark",
  "drug_std_qty",
  "assay_method",
]);

export function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function clean(value: unknown): string {
  if (value === null || value === undefined || value === "" || value === "null") {
    return "未提供";
  }
  if (typeof value === "object") return JSON.stringify(value);
  return String(value).replaceAll("\\r", " ").replaceAll("\\n", " ").trim() || "未提供";
}

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue);
  if (isRecord(value)) {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, stableValue(value[key])]),
    );
  }
  return value;
}

export function countExact(records: unknown[]): Array<{ record: unknown; count: number }> {
  const counted = new Map<string, { record: unknown; count: number }>();
  for (const record of records) {
    const key = JSON.stringify(stableValue(record));
    const existing = counted.get(key);
    if (existing) existing.count += 1;
    else counted.set(key, { record, count: 1 });
  }
  return [...counted.values()];
}

export function compareUserInputKeys(a: string, b: string): number {
  const aIndex = USER_INPUT_ORDER.indexOf(a);
  const bIndex = USER_INPUT_ORDER.indexOf(b);
  if (aIndex !== -1 || bIndex !== -1) {
    if (aIndex === -1) return 1;
    if (bIndex === -1) return -1;
    return aIndex - bIndex;
  }
  const aRisk = a.match(/^(R|PR)(\\d+)$/);
  const bRisk = b.match(/^(R|PR)(\\d+)$/);
  if (aRisk && bRisk) {
    if (aRisk[1] !== bRisk[1]) return aRisk[1] === "R" ? -1 : 1;
    return Number(aRisk[2]) - Number(bRisk[2]);
  }
  if (aRisk) return -1;
  if (bRisk) return 1;
  return a.localeCompare(b);
}

function genericLines(value: unknown, depth = 0): string[] {
  const indent = "  ".repeat(depth);
  if (Array.isArray(value)) {
    if (!value.length) return [\`\${indent}（空陣列）\`];
    return value.flatMap((item, index) => {
      if (isRecord(item) || Array.isArray(item)) {
        return [\`\${indent}- 第 \${index + 1} 筆\`, ...genericLines(item, depth + 1)];
      }
      return [\`\${indent}- \${clean(item)}\`];
    });
  }
  if (isRecord(value)) {
    const entries = Object.entries(value);
    if (!entries.length) return [\`\${indent}（空物件）\`];
    return entries.flatMap(([key, item]) => {
      if (isRecord(item) || Array.isArray(item)) {
        return [\`\${indent}\${key}：\`, ...genericLines(item, depth + 1)];
      }
      return [\`\${indent}\${key}：\${clean(item)}\`];
    });
  }
  return [\`\${indent}\${clean(value)}\`];
}

export function sourceRecords(rawSources: JsonRecord, key: string): unknown[] {
  const source = rawSources[key];
  if (!isRecord(source)) return [];
  return Array.isArray(source.rObject) ? source.rObject : [];
}

function compactRecord(record: unknown): string {
  if (!isRecord(record)) return clean(record);
  return Object.entries(record)
    .filter(([, value]) => value !== null && value !== undefined && value !== "" && value !== "null")
    .map(([key, value]) => \`\${key}:\${clean(value)}\`)
    .join("｜");
}

export type FormatOptions = {
  /**
   * 是否濾掉與糖尿病長期照護無關的檢驗類別。
   *
   * 預設 true（送進 LLM 的版本）。傳 false 會得到未過濾的完整整理版，
   * 頁面用它讓人看得到「濾掉前」與「濾掉後」的差別——只給結果而不給對照，
   * 沒有人能判斷濾掉的是不是不該濾的。
   */
  skipIrrelevantLabs?: boolean;
};

export function formatPatientJson(value: unknown, options: FormatOptions = {}): string {
  const skipIrrelevant = options.skipIrrelevantLabs ?? true;
  if (!isRecord(value)) {
    return [
      "【輸入資料】",
      ...genericLines(value),
      "",
      "【資料使用限制】",
      "以上僅重新排版，沒有推定缺少的診斷、日期、用藥狀態或治療資訊。",
    ].join("\\n");
  }

  const hasKnownStructure = ["downloadType", "userInfo", "userInput", "rawSources"].some((key) => key in value);
  if (!hasKnownStructure) {
    return [
      "【來源JSON欄位】",
      ...genericLines(value),
      "",
      "【資料使用限制】",
      "以上保留來源欄位並重新排版；空值或未出現欄位不得自行解讀為0或正常。",
    ].join("\\n");
  }

  const lines: string[] = ["【檔案與基本資料】", \`資料匯出類型：\${clean(value.downloadType)}\`];
  const userInfo = isRecord(value.userInfo) ? value.userInfo : {};
  const userInput = isRecord(value.userInput) ? value.userInput : {};
  const rawSources = isRecord(value.rawSources) ? value.rawSources : {};

  for (const [key, item] of Object.entries(userInfo)) lines.push(\`\${key}：\${clean(item)}\`);

  lines.push("", "【來源模型欄位】", "以下保留來源原值；未提供不等同於0。");
  const userInputKeys = Object.keys(userInput).sort(compareUserInputKeys);
  if (!userInputKeys.length) lines.push("未提供來源模型欄位。");
  for (const key of userInputKeys) {
    const label = USER_INPUT_LABELS[key] ? \`（\${USER_INPUT_LABELS[key]}）\` : "";
    lines.push(\`\${key}\${label}：\${clean(userInput[key])}\`);
  }

  lines.push("", "【DCSI與風險欄位說明】");
  lines.push("僅保留來源DCSI、R與PR原始欄位；整理階段不重新解釋分數。來源未出現的欄位不得自行補值，也不得直接視為0。");

  lines.push("", "【資料來源概況】");
  const sourceEntries = Object.entries(rawSources);
  if (!sourceEntries.length) lines.push("未提供rawSources資料來源。");
  for (const [key, source] of sourceEntries) {
    const records = isRecord(source) && Array.isArray(source.rObject) ? source.rObject : [];
    lines.push(\`\${SOURCE_LABELS[key] ?? key}（\${key}）：\${records.length}筆\${records.length ? "" : "，來源為空陣列"}\`);
  }

  const medications = sourceRecords(rawSources, "medication");
  const medicationUnique = countExact(medications);
  const medicationGroups = new Map<string, Array<{ text: string; count: number }>>();
  for (const item of medicationUnique) {
    const record = isRecord(item.record) ? item.record : {};
    const date = clean(record.drug_date).replaceAll("/", "-");
    const diagnosis = \`ICD \${clean(record.icd_code)}｜\${clean(record.icd_cname)}\`;
    const key = \`\${date}｜\${diagnosis}\`;
    // drug_ename 是商品名，和 drug_ing_name 的成分名語意重複，只留成分名。
    const detail = compactRecord(
      Object.fromEntries(
        Object.entries(record).filter(
          ([field]) =>
            !["drug_date", "icd_code", "icd_cname", "drug_ename"].includes(field) &&
            !BILLING_ONLY_FIELDS.has(field),
        ),
      ),
    );
    const group = medicationGroups.get(key) ?? [];
    group.push({ text: detail || "原紀錄沒有其他欄位", count: item.count });
    medicationGroups.set(key, group);
  }

  lines.push("", "【用藥紀錄】");
  lines.push(\`來源共\${medications.length}筆；完全相同紀錄合併後\${medicationUnique.length}筆。重複次數以×N保留；不同欄位不合併。\`);
  if (!medications.length) lines.push("未提供用藥紀錄。");
  for (const key of [...medicationGroups.keys()].sort().reverse()) {
    lines.push(key);
    for (const item of medicationGroups.get(key) ?? []) {
      lines.push(\`- \${item.text}\${item.count > 1 ? \`｜×\${item.count}\` : ""}\`);
    }
  }

/**
 * 送進 LLM 的檢驗紀錄要不要留這一筆。
 *
 * 這條流程只為糖尿病長期照護服務，而申報檢驗百百種。實測五位病人 9,001 筆
 * 檢驗共 2.1M 字元，其中三成是我們**在 prompt 裡已經明講要模型忽略**、卻照樣
 * 送進去的東西——送了再叫它不要看，付兩次錢。
 *
 * 兩種刪法，差別很重要：
 *
 * 1. **整碼刪**：微生物培養（13007C）、藥敏（13023C）、細菌鏡檢（13006C）、
 *    輸血交叉配合（11002C）。已逐筆確認這四碼底下**沒有任何核心指標**，
 *    且都是某次急性事件當下的狀態，沒有採檢日就無從判讀。
 *
 * 2. **依項目名稱刪**：血液氣體、白血球分類、發炎指標、凝血。**不能整碼刪**——
 *    血液氣體分析（09041B）底下藏著 K×49、Na×49、Hb×29、Glucose×29，
 *    整碼砍掉會連這些核心指標一起丟。
 *
 * 只影響送給模型的文字。程式的門檻判定走 extractPatientFacts 另一條路，
 * 讀的是原始 JSON，完全不受這裡影響——有測試釘住兩者的產出不變。
 */
const LLM_SKIP_ORDER_CODES = /^(13007C|13023C|13006C|11002C)$/;
const LLM_SKIP_ITEM_PATTERNS: ReadonlyArray<RegExp> = [
  /^(p?H|pH值)$/i,
  /^(PO2|pO2|PCO2|pCO2|HCO3|TCO2|O2SAT|BE|BEecf|BEb|SBC|ctO2|FIO2|A-?aDO2)/i,
  /(lymphocyte|monocyte|basophil|eosinophil|neutrophil|^ANC$|^Meta$|^Blast$|^Band|myelocyte|atypical|^Promye)/i,
  /(^hs)?CRP|procalcitonin|^ESR$|紅血球沉降/i,
  /^(PT|aPTT|APTT|INR)$|凝血|fibrinogen|D-?dimer/i,
];

function skipForLlm(record: JsonRecord): boolean {
  if (LLM_SKIP_ORDER_CODES.test(String(record.order_code ?? "").trim())) return true;
  const name = String(record.assay_item_name ?? "").trim();
  return LLM_SKIP_ITEM_PATTERNS.some((pattern) => pattern.test(name));
}

  const labs = sourceRecords(rawSources, "labData");
  const labUnique = countExact(labs);
  const labGroups = new Map<string, Array<{ text: string; count: number }>>();
  let skippedForLlm = 0;
  for (const item of labUnique) {
    const record = isRecord(item.record) ? item.record : {};
    if (skipIrrelevant && skipForLlm(record)) {
      skippedForLlm += item.count;
      continue;
    }
    const key = [
      clean(record.fee_ym),
      clean(record.order_code),
      clean(record.order_name),
      \`檢體或模式:\${clean(record.inspect_mode)}\`,
    ].join("｜");
    let detail = \`\${clean(record.assay_item_name)}=\${clean(record.assay_value)}\`;
    if (clean(record.unit_data) !== "未提供") detail += \` \${clean(record.unit_data)}\`;
    detail += \`｜參考:\${clean(record.consult_value)}\`;
    const extras = Object.entries(record)
      .filter(([field, itemValue]) =>
        ![
          "fee_ym",
          "order_code",
          "order_name",
          "assay_method",
          "inspect_mode",
          "assay_item_name",
          "assay_value",
          "unit_data",
          "consult_value",
        ].includes(field) && !BILLING_ONLY_FIELDS.has(field) && itemValue !== null && itemValue !== undefined && itemValue !== "",
      )
      .map(([field, itemValue]) => \`\${field}:\${clean(itemValue)}\`);
    if (extras.length) detail += \`｜其他欄位:\${extras.join("、")}\`;
    const group = labGroups.get(key) ?? [];
    group.push({ text: detail, count: item.count });
    labGroups.set(key, group);
  }

  lines.push("", "【檢驗與檢查紀錄】");
  lines.push(
    \`來源共\${labs.length}筆；完全相同紀錄合併後\${labUnique.length}筆。\` +
      (skippedForLlm
        ? \`其中\${skippedForLlm}筆與糖尿病長期照護無關（微生物培養、藥敏、輸血配合、血液氣體、白血球分類、發炎與凝血指標），未列於下方。\`
        : "") +
      "若來源只有費用年月而沒有採檢日時，不得推定同月份內的先後順序。",
  );
  if (!labs.length) lines.push("未提供檢驗與檢查紀錄。");
  for (const key of [...labGroups.keys()].sort().reverse()) {
    lines.push(key);
    for (const item of labGroups.get(key) ?? []) {
      lines.push(\`- \${item.text}\${item.count > 1 ? \`｜×\${item.count}\` : ""}\`);
    }
  }

  lines.push("", "【其他來源的非空紀錄】");
  let otherCount = 0;
  for (const [key] of sourceEntries.filter(([sourceKey]) => !["medication", "labData"].includes(sourceKey))) {
    const records = sourceRecords(rawSources, key);
    if (!records.length) continue;
    otherCount += records.length;
    const unique = countExact(records);
    lines.push(\`\${SOURCE_LABELS[key] ?? key}（\${key}）：來源\${records.length}筆，完全相同紀錄合併後\${unique.length}筆。\`);
    unique.forEach((item, index) => {
      lines.push(\`- \${index + 1}. \${compactRecord(item.record)}\${item.count > 1 ? \`｜×\${item.count}\` : ""}\`);
    });
  }
  if (!otherCount) lines.push("其餘來源目前沒有可列出的紀錄。");

  const otherRootKeys = Object.keys(value).filter(
    (key) => !["downloadType", "userInfo", "userInput", "rawSources"].includes(key),
  );
  if (otherRootKeys.length) {
    lines.push("", "【其他根層欄位】");
    for (const key of otherRootKeys) lines.push(\`\${key}：\${clean(value[key])}\`);
  }

  lines.push("", "【資料使用限制】");
  lines.push("以上為來源JSON重新排版；除合併完全相同紀錄外，未刪除不同結果，也未判定哪一筆較可信。重複筆數均以×N保留。");
  lines.push("不同檢驗數值可能代表真實病程變化，也可能涉及資料品質；若有疑義，應由醫療人員結合實際採檢時間與臨床狀況確認。");
  lines.push("來源未提供的日期、糖尿病類型、診斷、檢驗、用藥狀態或治療資訊不得自行補寫；歷史申報用藥不得直接描述為目前仍在使用。");
  return lines.join("\\n");
}
`,B=`/**
 * 第一層：確定性事實抽取（arm C）。
 *
 * 目的是把「申報資料可以支持的結論」和「申報資料無法支持的推論」在程式層就分開，
 * 而不是寫成 prompt 規則交給模型記住。
 *
 * 三條硬規則：
 *   1. 來源沒有的欄位一律是 unknown，不補值、不視為 0、不視為正常。
 *   2. 用藥一律標記為「曾有申報紀錄」＋最後申報日，永遠不產生「目前用藥」欄位。
 *   3. 檢驗只有費用年月時，不產生任何順序或趨勢欄位。
 */

import { isRecord, sourceRecords, type JsonRecord } from "./format-patient.ts";

export type Unknown = { known: false; reason: string };
export type Known<T> = { known: true; value: T };
export type Maybe<T> = Known<T> | Unknown;

function known<T>(value: T): Known<T> {
  return { known: true, value };
}

function unknown(reason: string): Unknown {
  return { known: false, reason };
}

export type DiabetesTypeEvidence = {
  /** 判定結果。conflicting 與 absent 都不得用來啟用 T1／T2 補充模組。 */
  verdict: "type1-confirmed" | "type2-confirmed" | "conflicting" | "absent";
  type1IcdCodes: string[];
  type2IcdCodes: string[];
  otherDiabetesIcdCodes: string[];
  note: string;
};

export type MedicationClassFact = {
  atcClass: string;
  /** 這個分類出現過的藥品名稱（去重，最多列 8 個） */
  drugNames: string[];
  recordCount: number;
  /** 最後一次申報日期；來源沒有日期時為 null */
  lastClaimDate: string | null;
  /** 距報告日的天數；無法計算時為 null */
  daysSinceLastClaim: number | null;
};

export type LabItemFact = {
  itemName: string;
  /** 健保醫令代碼。判定檢體與項目時比名稱可靠得多。 */
  orderCodes: string[];
  /** 來源出現過的所有原始值，逐字保留、不排序成趨勢 */
  rawValues: string[];
  unit: string | null;
  referenceRange: string | null;
  /** 來源提供的費用年月集合 */
  feeMonths: string[];
  /** 來源是否提供實際採檢日 */
  hasDrawDates: boolean;
};

export type RiskField = {
  code: string;
  present: boolean;
  value: number | null;
  rawValue: string | null;
};

export type PatientFacts = {
  reportDate: Maybe<string>;
  dataCutoff: Maybe<string>;
  birthday: Maybe<string>;
  ageYears: Maybe<number>;
  sexCode: Maybe<string>;
  /**
   * 已解讀的性別，來源是 userInfo.gender（直接就是 M／F）。
   *
   * 刻意不從 userInput.SEX 推。五位病人剛好 SEX=0→M、SEX=1→F，但那是從
   * 五筆歸納出來的，不是規格。血球參考值是性別分層的（M 13.1-17.2／F 11.0-15.2），
   * 猜錯會讓 Hb 12.5 的男性被判為正常——寧可未知，也不要錯。
   */
  sex: Maybe<"男性" | "女性">;
  diabetesOnsetDate: Maybe<string>;
  diabetesDurationYears: Maybe<number>;
  comorbidityFlags: {
    hypertension: Maybe<boolean>;
    hyperlipidemia: Maybe<boolean>;
    ckd: Maybe<boolean>;
    p4p: Maybe<boolean>;
  };
  /**
   * 申報診斷碼裡直接指向慢性腎臟病的碼。
   *
   * CKD 欄位為 0、R3 也沒有值的病人仍可能有這些碼——DCSI 只認診斷碼，
   * 而診斷碼只出現在有開藥的就診，漏掉的機會不小。
   */
  ckdIcdCodes: string[];
  dcsiTotal: Maybe<number>;
  grade: Maybe<string>;
  ageGroup: Maybe<string>;
  /** 已發生併發症現況 R1–R7 */
  existingComplications: RiskField[];
  /** 未來風險預測 PR1–PR7 */
  riskPredictions: RiskField[];
  diabetesType: DiabetesTypeEvidence;
  /** 申報用藥的成分名（去重）。ATC5 分類太粗，SGLT2i 只會顯示「抗糖尿病藥物」。 */
  medicationIngredients: string[];
  medicationClasses: MedicationClassFact[];
  medicationRecordCount: number;
  medicationDateRange: Maybe<{ earliest: string; latest: string }>;
  labItems: LabItemFact[];
  labRecordCount: number;
  labHasDrawDates: boolean;
  /** 抽取過程中偵測到、需要人工注意的資料品質問題 */
  dataQualityFlags: string[];
};

/**
 * 慢性腎臟病／糖尿病腎病變的申報診斷碼。
 *
 * 用 DCSI 腎病變本來就採用的碼集（ICD-9 250.4x、580–588、593.9、V42.0、V45.1、V56.x
 * 對應到 ICD-10），因為要補的正是 R3 應該抓到卻沒抓到的那一塊。
 * 刻意不含 N17（急性腎損傷）——那是急性事件，不是慢性腎臟病。
 */
const CKD_ICD = /^(E1[0-4]2|N0[0-8]|N1[89]|N2[5-8]|Z940|Z992|Z49)/i;

const T1_ICD = /^E10/i;
const T2_ICD = /^E11/i;
const OTHER_DM_ICD = /^E1[234]/i;

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(String(value).trim());
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeDate(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const text = String(value).trim().replaceAll("/", "-");
  return /^\\d{4}-\\d{2}-\\d{2}$/.test(text) ? text : null;
}

function daysBetween(from: string, to: string): number | null {
  const a = Date.parse(\`\${from}T00:00:00Z\`);
  const b = Date.parse(\`\${to}T00:00:00Z\`);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return Math.round((b - a) / 86_400_000);
}

function flagFromCode(value: unknown, label: string): Maybe<boolean> {
  const numeric = toNumber(value);
  if (numeric === null) return unknown(\`來源未提供 \${label} 欄位\`);
  return known(numeric === 1);
}

function riskFields(userInput: JsonRecord, prefix: "R" | "PR"): RiskField[] {
  const fields: RiskField[] = [];
  for (let index = 1; index <= 7; index += 1) {
    const code = \`\${prefix}\${index}\`;
    const present = Object.hasOwn(userInput, code);
    const raw = present ? userInput[code] : null;
    fields.push({
      code,
      present,
      value: present ? toNumber(raw) : null,
      rawValue: present && raw !== null && raw !== undefined ? String(raw) : null,
    });
  }
  return fields;
}

function detectDiabetesType(medications: unknown[]): DiabetesTypeEvidence {
  const type1 = new Set<string>();
  const type2 = new Set<string>();
  const other = new Set<string>();

  for (const record of medications) {
    if (!isRecord(record)) continue;
    const code = String(record.icd_code ?? "").trim();
    if (!code) continue;
    if (T1_ICD.test(code)) type1.add(code);
    else if (T2_ICD.test(code)) type2.add(code);
    else if (OTHER_DM_ICD.test(code)) other.add(code);
  }

  const type1Codes = [...type1].sort();
  const type2Codes = [...type2].sort();
  const otherCodes = [...other].sort();

  if (type1Codes.length && type2Codes.length) {
    return {
      verdict: "conflicting",
      type1IcdCodes: type1Codes,
      type2IcdCodes: type2Codes,
      otherDiabetesIcdCodes: otherCodes,
      note: "申報資料同時出現第一型與第二型糖尿病診斷碼，無法據此判定類型；不得啟用任何 T1／T2 補充模組。",
    };
  }
  if (type1Codes.length) {
    return {
      verdict: "type1-confirmed",
      type1IcdCodes: type1Codes,
      type2IcdCodes: [],
      otherDiabetesIcdCodes: otherCodes,
      note: "申報資料只出現第一型糖尿病診斷碼。注意申報診斷碼是計費用途，仍應由醫療團隊確認。",
    };
  }
  if (type2Codes.length) {
    return {
      verdict: "type2-confirmed",
      type1IcdCodes: [],
      type2IcdCodes: type2Codes,
      otherDiabetesIcdCodes: otherCodes,
      note: "申報資料只出現第二型糖尿病診斷碼。注意申報診斷碼是計費用途，仍應由醫療團隊確認。",
    };
  }
  return {
    verdict: "absent",
    type1IcdCodes: [],
    type2IcdCodes: [],
    otherDiabetesIcdCodes: otherCodes,
    note: "申報用藥紀錄中沒有 E10／E11 糖尿病診斷碼，無法判定類型。",
  };
}

function extractMedications(medications: unknown[], reportDate: string | null) {
  const byClass = new Map<string, { names: Set<string>; count: number; dates: string[] }>();
  const allDates: string[] = [];

  for (const record of medications) {
    if (!isRecord(record)) continue;
    const atcClass = String(record.drug_atc5_name ?? "").trim() || "未分類或來源未提供分類";
    const name = String(record.drug_ename ?? "").trim();
    const date = normalizeDate(record.drug_date);
    if (date) allDates.push(date);

    const entry = byClass.get(atcClass) ?? { names: new Set<string>(), count: 0, dates: [] };
    if (name) entry.names.add(name);
    entry.count += 1;
    if (date) entry.dates.push(date);
    byClass.set(atcClass, entry);
  }

  const classes: MedicationClassFact[] = [...byClass.entries()]
    .map(([atcClass, entry]) => {
      const sorted = [...entry.dates].sort();
      const lastClaimDate = sorted.length ? sorted[sorted.length - 1] : null;
      return {
        atcClass,
        drugNames: [...entry.names].sort().slice(0, 8),
        recordCount: entry.count,
        lastClaimDate,
        daysSinceLastClaim: lastClaimDate && reportDate ? daysBetween(lastClaimDate, reportDate) : null,
      };
    })
    .sort((a, b) => {
      if (a.lastClaimDate && b.lastClaimDate && a.lastClaimDate !== b.lastClaimDate) {
        return b.lastClaimDate.localeCompare(a.lastClaimDate);
      }
      return b.recordCount - a.recordCount;
    });

  const sortedDates = allDates.sort();
  const dateRange: Maybe<{ earliest: string; latest: string }> = sortedDates.length
    ? known({ earliest: sortedDates[0], latest: sortedDates[sortedDates.length - 1] })
    : unknown("用藥紀錄沒有可解析的日期");

  return { classes, dateRange };
}

/**
 * 不是病人測量值的列。
 *
 * 實測五位病人共 79 筆：檢體品質旗標（溶血 28、脂血 28、Sample Hemolysis 5，
 * 值多半是 0／無單位）與微生物培養的自由文字註解（COMMENT 18 筆，內容是
 * 「因分離出 VRE 抗藥性菌株,請執行接觸隔離」這類敘述）。
 *
 * 為什麼是濾掉而不是提示：溶血確實會假性升高血鉀，但這批資料**沒有任何欄位
 * 把品質旗標連到特定的結果列**，也無法確認那次抽血到底有沒有驗鉀。既然無從
 * 辨別，提示只會變成每份報告都掛一句沒人能處理的警語。留著它們還有一個壞處：
 * 它們會被送進 LLM 的輸入，模型有機會把「溶血」當成一個發現寫進報告。
 */
function isNotAMeasurement(itemName: string): boolean {
  if (/^(溶血|脂血|黃疸)$/.test(itemName)) return true;
  if (/sample\\s+(hemoly|haemoly)|icterus|lipemi/i.test(itemName)) return true;
  if (/^comment$/i.test(itemName) || /^[:：]/.test(itemName)) return true;
  return false;
}

function extractLabs(labs: unknown[]) {
  const byItem = new Map<
    string,
    { values: string[]; units: Set<string>; refs: Set<string>; months: Set<string>; codes: Set<string> }
  >();
  let hasDrawDates = false;

  for (const record of labs) {
    if (!isRecord(record)) continue;
    if (normalizeDate(record.assay_date) || normalizeDate(record.inspect_date)) hasDrawDates = true;

    const itemName = String(record.assay_item_name ?? "").trim() || String(record.order_name ?? "").trim() || "未提供項目名稱";
    const value = String(record.assay_value ?? "").trim();
    if (!value) continue;
    if (isNotAMeasurement(itemName)) continue;

    // 分組鍵必須含單位與醫令代碼。只用名稱的話，尿液鏡檢的 WBC（/HPF，參考 0–3）
    // 會和血液的 WBC（10^3/μL，參考 4–10）併成同一項，單位與參考範圍全混在一起，
    // 判定「超出範圍」時會產生大量假警報。
    const unitKey = String(record.unit_data ?? "").trim();
    const codeKey = String(record.order_code ?? "").trim();
    const groupKey = \`\${itemName}｜\${unitKey}｜\${codeKey}\`;

    const entry = byItem.get(groupKey) ?? {
      values: [],
      units: new Set<string>(),
      refs: new Set<string>(),
      months: new Set<string>(),
      codes: new Set<string>(),
    };
    const orderCode = String(record.order_code ?? "").trim();
    if (orderCode) entry.codes.add(orderCode);
    entry.values.push(value);
    const unit = String(record.unit_data ?? "").trim();
    if (unit && unit !== "null") entry.units.add(unit);
    const ref = String(record.consult_value ?? "").trim();
    if (ref && ref !== "null") entry.refs.add(ref);
    const month = String(record.fee_ym ?? "").trim();
    if (month) entry.months.add(month);
    byItem.set(groupKey, entry);
  }

  const items: LabItemFact[] = [...byItem.entries()]
    .map(([groupKey, entry]) => ({
      itemName: groupKey.split("｜")[0],
      orderCodes: [...entry.codes].sort(),
      rawValues: entry.values,
      unit: entry.units.size === 1 ? [...entry.units][0] : entry.units.size > 1 ? [...entry.units].join(" / ") : null,
      referenceRange: entry.refs.size ? [...entry.refs][0] : null,
      feeMonths: [...entry.months].sort(),
      hasDrawDates,
    }))
    .sort((a, b) => b.rawValues.length - a.rawValues.length);

  return { items, hasDrawDates };
}

export function extractPatientFacts(input: unknown): PatientFacts {
  const root = isRecord(input) ? input : {};
  const userInput = isRecord(root.userInput) ? root.userInput : {};
  const rawSources = isRecord(root.rawSources) ? root.rawSources : {};

  const reportDate = normalizeDate(userInput.REPORT_DATE);
  const birthday = normalizeDate(userInput.BIRTHDAY);
  const onset = normalizeDate(userInput.INDX_DATE);

  const ageDays = birthday && reportDate ? daysBetween(birthday, reportDate) : null;
  const durationRaw = toNumber(userInput.T);

  const medications = sourceRecords(rawSources, "medication");
  const labs = sourceRecords(rawSources, "labData");
  const { classes, dateRange } = extractMedications(medications, reportDate);
  const { items, hasDrawDates } = extractLabs(labs);

  const dataQualityFlags: string[] = [];
  if (!hasDrawDates && labs.length) {
    dataQualityFlags.push(
      "檢驗紀錄只有費用年月、沒有採檢日期，因此無法建立時間順序或趨勢。任何「趨勢」「最近一次」的敘述都沒有資料支持。",
    );
  }
  if (!reportDate) dataQualityFlags.push("來源未提供 REPORT_DATE，無法標示資料截止日。");
  const existingComplications = riskFields(userInput, "R");
  const riskPredictions = riskFields(userInput, "PR");
  /*
   * R／PR 缺欄位不是資料缺漏，是資料模型本身。
   *
   * 先前這裡對每位病人都推一條「來源未出現下列欄位，不得補值也不得視為 0」，
   * 兩半都是錯的：
   *   - R 缺欄位就是該項 DCSI 分數為 0（六位病人 sum(R) 全部等於 DCSI），
   *     而且程式自己就是這樣處理的——同一份輸入裡卻叫模型不要當成 0，自相矛盾。
   *   - PR 缺欄位代表該主題已有 R 值、不需要預測，不是來源漏給。
   * 真正的異常只有一種：同一主題 R 與 PR 同時出現，或兩者同時缺席。
   */
  const conflicting: string[] = [];
  for (let topic = 1; topic <= 6; topic += 1) {
    const r = existingComplications.find((item) => item.code === \`R\${topic}\`);
    const pr = riskPredictions.find((item) => item.code === \`PR\${topic}\`);
    if (r?.present && pr?.present) conflicting.push(\`R\${topic} 與 PR\${topic} 同時有值\`);
    if (!r?.present && !pr?.present) conflicting.push(\`R\${topic} 與 PR\${topic} 同時缺席\`);
  }
  if (conflicting.length) {
    dataQualityFlags.push(
      \`下列主題不符合來源的資料模型（同一主題應只有 R 或 PR 其中一個）：\${conflicting.join("、")}。\`,
    );
  }

  const diabetesType = detectDiabetesType(medications);
  if (diabetesType.verdict === "conflicting") {
    dataQualityFlags.push(diabetesType.note);
  }

  const genderRaw = String((isRecord(root.userInfo) ? root.userInfo.gender : "") ?? "").trim().toUpperCase();
  const resolvedSex: "男性" | "女性" | null =
    genderRaw === "M" || genderRaw === "男" ? "男性" : genderRaw === "F" || genderRaw === "女" ? "女性" : null;

  return {
    reportDate: reportDate ? known(reportDate) : unknown("來源未提供 REPORT_DATE"),
    dataCutoff: reportDate ? known(reportDate) : unknown("來源未提供資料截止日"),
    birthday: birthday ? known(birthday) : unknown("來源未提供 BIRTHDAY"),
    ageYears: ageDays !== null ? known(Math.floor(ageDays / 365.25)) : unknown("缺少出生日期或報告日期，無法計算年齡"),
    sexCode: userInput.SEX !== undefined && userInput.SEX !== null && userInput.SEX !== ""
      ? known(String(userInput.SEX))
      : unknown("來源未提供 SEX"),
    sex: resolvedSex ? known(resolvedSex) : unknown("userInfo.gender 未提供或無法解讀"),
    diabetesOnsetDate: onset ? known(onset) : unknown("來源未提供 INDX_DATE"),
    diabetesDurationYears: durationRaw !== null ? known(Number(durationRaw.toFixed(1))) : unknown("來源未提供 T"),
    ckdIcdCodes: [
      ...new Set(
        medications
          .map((record) => (isRecord(record) ? String(record.icd_code ?? "").trim() : ""))
          .filter((code) => code && CKD_ICD.test(code.replace(/\\./g, ""))),
      ),
    ].sort(),
    comorbidityFlags: {
      hypertension: flagFromCode(userInput.HT, "HT"),
      hyperlipidemia: flagFromCode(userInput.HL, "HL"),
      ckd: flagFromCode(userInput.CKD, "CKD"),
      p4p: flagFromCode(userInput.P4P, "P4P"),
    },
    dcsiTotal: toNumber(userInput.DCSI) !== null ? known(toNumber(userInput.DCSI) as number) : unknown("來源未提供 DCSI"),
    grade: userInput.GRADE !== undefined ? known(String(userInput.GRADE)) : unknown("來源未提供 GRADE"),
    ageGroup: userInput.AGEGP !== undefined ? known(String(userInput.AGEGP)) : unknown("來源未提供 AGEGP"),
    existingComplications,
    riskPredictions,
    diabetesType,
    medicationIngredients: [
      ...new Set(
        medications
          .map((record) => (isRecord(record) ? String(record.drug_ing_name ?? "").trim() : ""))
          .filter(Boolean),
      ),
    ].sort(),
    medicationClasses: classes,
    medicationRecordCount: medications.length,
    medicationDateRange: dateRange,
    labItems: items,
    labRecordCount: labs.length,
    labHasDrawDates: hasDrawDates,
    dataQualityFlags,
  };
}

function maybeText<T>(value: Maybe<T>, format?: (item: T) => string): string {
  if (!value.known) return \`未知（\${value.reason}）\`;
  return format ? format(value.value) : String(value.value);
}

/**
 * 給 arm C 的 LLM 看的精簡事實摘要。
 * 刻意不含病人正文、不含指引內容，只有選模組需要的判斷依據。
 */
export function factsForSelectorPrompt(facts: PatientFacts, options: { maxMedicationClasses?: number } = {}): string {
  const maxClasses = options.maxMedicationClasses ?? 25;
  const lines: string[] = [];

  lines.push("【基本判斷依據】");
  lines.push(\`報告日期：\${maybeText(facts.reportDate)}\`);
  lines.push(\`年齡：\${maybeText(facts.ageYears, (v) => \`\${v} 歲\`)}\`);
  lines.push(\`性別：\${facts.sex.known ? facts.sex.value : maybeText(facts.sex)}\`);
  lines.push(\`糖尿病病程年數：\${maybeText(facts.diabetesDurationYears, (v) => \`\${v} 年\`)}\`);
  lines.push(\`DCSI 總分：\${maybeText(facts.dcsiTotal)}\`);
  lines.push(\`高血壓：\${maybeText(facts.comorbidityFlags.hypertension, (v) => (v ? "是" : "否"))}\`);
  lines.push(\`高血脂：\${maybeText(facts.comorbidityFlags.hyperlipidemia, (v) => (v ? "是" : "否"))}\`);
  lines.push(\`慢性腎臟病：\${maybeText(facts.comorbidityFlags.ckd, (v) => (v ? "是" : "否"))}\`);

  lines.push("", "【已發生併發症現況（R）】");
  for (const item of facts.existingComplications) {
    lines.push(\`\${item.code}：\${item.present ? \`\${item.rawValue}\` : "來源未出現此欄位（不得視為 0）"}\`);
  }

  lines.push("", "【未來風險預測（PR）】");
  for (const item of facts.riskPredictions) {
    lines.push(\`\${item.code}：\${item.present ? \`\${item.rawValue}\` : "來源未出現此欄位（不得視為 0）"}\`);
  }

  lines.push("", "【糖尿病類型證據】");
  lines.push(\`判定：\${facts.diabetesType.verdict}\`);
  lines.push(\`第一型診斷碼：\${facts.diabetesType.type1IcdCodes.join("、") || "無"}\`);
  lines.push(\`第二型診斷碼：\${facts.diabetesType.type2IcdCodes.join("、") || "無"}\`);
  lines.push(\`說明：\${facts.diabetesType.note}\`);

  lines.push("", "【用藥申報分類（非目前用藥）】");
  lines.push(
    \`共 \${facts.medicationRecordCount} 筆申報紀錄，涵蓋 \${facts.medicationClasses.length} 個 ATC 分類。以下為最近申報的前 \${Math.min(maxClasses, facts.medicationClasses.length)} 類。\`,
  );
  for (const item of facts.medicationClasses.slice(0, maxClasses)) {
    const last = item.lastClaimDate
      ? \`最後申報 \${item.lastClaimDate}\${item.daysSinceLastClaim !== null ? \`（距報告日 \${item.daysSinceLastClaim} 天）\` : ""}\`
      : "來源無日期";
    lines.push(\`- \${item.atcClass}｜\${item.recordCount} 筆｜\${last}\`);
  }

  lines.push("", "【檢驗資料可用性】");
  lines.push(\`共 \${facts.labRecordCount} 筆；是否有採檢日：\${facts.labHasDrawDates ? "有" : "沒有，只有費用年月"}\`);

  lines.push("", "【R／PR 的資料模型】");
  lines.push(
    "- 同一主題只會出現 R 或 PR 其中一個。",
    "- R 有值＝該併發症已發生；R 未出現＝尚未發生（該項 DCSI 分數為 0）。",
    "- PR 未出現＝該主題已有 R 值、不需要預測，不得視為 PR=0。",
    "- 來源只提供 PR1–PR6，沒有 PR7。",
  );

  if (facts.dataQualityFlags.length) {
    lines.push("", "【資料限制】");
    for (const flag of facts.dataQualityFlags) lines.push(\`- \${flag}\`);
  }

  return lines.join("\\n");
}
`,V=`/**
 * arm C 的組裝層。
 *
 * 責任分配（這一版和上一版最大的差別）：
 *
 *   併發症主題要不要納入 → **程式**依 R／PR 判定，不由 LLM 決定。
 *     上一版讓 LLM 依「R>0 或 PR 存在」選模組，結果五位病人幾乎都選滿六個主題，
 *     個人化整個塌掉。原因不是模型選錯，是規則太寬。
 *
 *   LLM 只負責規則做不到的事：排出前三優先、指出資料中需要醫療團隊注意的地方，
 *   以及對程式的判定提出不同意見（不同意見會被記錄，但不會覆寫程式判定）。
 *
 *   病人可見正文一律由程式以固定文字組合，LLM 不改寫、不補數值。
 */

import {
  EDUCATION_MODULES,
  MODULE_BY_ID,
  MODULE_CATALOG_APPROVED,
  MODULE_CATALOG_VERSION,
} from "./education-modules.ts";
import { SELF_CARE_BY_ID, SELF_CARE_VERSION, selectSelfCareModules } from "./self-care-modules.ts";
import { RULES_VERSION, RULES_SOURCE, RULES_BY_ID, citationShort } from "./guideline-rules.ts";
import { resolveTargets, type ResolvedPlanTargets } from "./resolve-targets.ts";
import type { PatientFacts } from "./patient-facts.ts";
import { SHARED_CARE_BLOCKS, followUpForClinician, followUpSchedule } from "./shared-care.ts";
import {
  describeRange,
  describeRangeForClinician,
  evaluateThresholds,
  extractLabFindings,
  kidneyLabEvidence,
  lowestMeasuredGlucose,
  type Analyte,
} from "./lab-findings.ts";
import { ANALYTE_TO_MODULE, compareToTargets, outOfTargetOnly } from "./target-comparison.ts";
import { formatLabReview, type LabReviewCheck } from "./lab-llm.ts";
import { formatLabNarrative, type LabNarrativeCheck } from "./lab-narrative.ts";

/**
 * PR 數值的極性——整個 arm C 的臨床意義都掛在這一個常數上，改錯會把每位病人的
 * 風險判定整個反過來，因此把來源寫在這裡，並且只在這裡定義一次。
 *
 * **2026-08-04：由資料來源方確認為 zero-is-low-risk。**
 *   PR=0 日常維持、PR=1 適度介入、PR=2 積極照護。
 *   同時確認先前流傳的 prompt（v14 及其衍生說法）在這一點上是錯的。
 *
 * 這推翻了先前依資料歸納的設定，過程記在這裡以免重蹈：
 *
 *   歸納一：舊批次匯出同時給了數值與中文敘述，同一位病人 PR3=0、PR4=0、PR6=0，
 *     敘述為「腎病變:高風險, 神經病變:高風險, 周邊血管病變:高風險」。
 *     那份對照現在看來要嘛是另一套編碼，要嘛是匯出時就已對錯，不可作為依據。
 *
 *   歸納二：三位 CKD=1 的病人 PR3 全部為 0，唯一 PR3=2 的病人 CKD=0。
 *     依確認後的極性，等於風險模型對已有慢性腎臟病的人預測「腎病變日常維持」。
 *     ⚠ 這個現象沒有被解釋掉，值得向來源方追問——但 n 只有 3，
 *     而且推導規則本來就不對我們公開，不足以推翻書面確認。
 *
 * 教訓：靠六位病人的資料歸納一個決定臨床方向的常數，即使內部一致也可能是錯的。
 * 這種常數要的是規格，不是統計。
 *
 * ── R 值的意義（2026-08-05 由資料負責人確認）──────────────────
 *
 * R1–R7 就是 DCSI 的分項分數，**DCSI 怎麼算就怎麼用**，我們不另做判斷。
 * 六位病人 sum(R) 全部等於 DCSI，無一例外，與這個說法一致。
 *
 * 因此 R4=2 不是錯誤：原始 DCSI 的神經病變雖然只計 0/1，但這份資料的實作
 * 計到 2，我們照收。規格文件寫「R4 區分 0/1」講的是狀態數（有／無），
 * 不是字面值——實測 R4 只出現 0 與 2，從沒出現 1，與二元一致。
 */
/** 風險最低，維持既有照護即可，不納入主題內容 */
export const PR_LOW = 0;
/** 中等風險，只給簡短提醒 */
export const PR_MODERATE = 1;
/** 風險最高，需要完整模組 */
export const PR_HIGH = 2;

/** PR 分級用語。沿用 v14 已定義的三級，避免病人版出現「高／中／低風險」標籤。 */
export const PR_ACTION_TIER: Record<number, string> = {
  [PR_HIGH]: "積極照護",
  [PR_MODERATE]: "適度介入",
  [PR_LOW]: "日常維持",
};

const TOPIC_TO_MODULE: Record<number, string> = {
  1: "EYE-CORE",
  2: "STROKE-CORE",
  3: "KIDNEY-CORE",
  4: "NERVE-CORE",
  5: "HEART-CORE",
  6: "LEG-CIRCULATION-CORE",
};

const TOPIC_NAMES: Record<number, string> = {
  1: "視網膜病變",
  2: "腦血管疾病",
  3: "腎臟病變",
  4: "神經病變",
  5: "心血管疾病",
  6: "周邊血管疾病",
  // 第 7 項沒有對應的衛教模組（來源也不提供 PR7），但主管機關要求現況必須呈現。
  7: "代謝性急症",
};

export type TopicKind =
  | "established"
  | "prevention-active"
  | "prevention-moderate"
  | "excluded";

export type TopicDecision = {
  topic: number;
  topicName: string;
  moduleId: string;
  kind: TopicKind;
  rValue: number | null;
  prValue: number | null;
  reason: string;
  /**
   * 只由檢驗數值救回來的主題。
   *
   * KDIGO 對慢性腎臟病的定義要求異常「持續三個月以上」，而申報資料只有費用
   * 年月、沒有採檢日期——單一筆 eGFR 58 可能是急性腎損傷、脫水、或那天的
   * 檢驗誤差。衛教內容照給（腎功能異常本來就該講），但醫師版不能寫成
   * 「已發生」，否則等於用一筆無日期的數字下了一個需要時序才能下的診斷。
   */
  provisional?: boolean;
};

/**
 * 確定性的主題判定。
 *
 * 先講來源的資料模型，因為判定完全建立在它上面：
 * **同一個主題，R 與 PR 只會出現其中一個。** 已發生的併發症輸出 R（值恆 ≥1），
 * 尚未發生的才輸出 PR 風險預測。實測六位病人 × 7 個主題共 42 個位置，
 * 兩者同時出現的次數是 0，恰有其一的是 37（其餘 5 個是 R7/PR7，
 * 因為來源只提供 PR1–PR6，沒有 PR7）。
 *
 * 所以「R 缺值 + PR 存在」不是資訊不明，而是**該併發症尚未發生**——
 * 正因為沒發生，模型才會為它產生風險預測。
 *
 *   R 存在（恆 >0）            → 已發生，完整模組
 *   R 缺值、PR 為高風險        → 尚未發生，完整模組（預防內容）
 *   R 缺值、PR 為中風險        → 尚未發生，只給簡短提醒
 *   R 缺值、PR 為低風險        → 不納入
 *   R 與 PR 皆缺               → 真的無從判斷，不納入
 *
 * 另外：來源的 CKD 欄位若為 1，代表已有慢性腎臟病，即使 R3 缺值也要以
 * 已發生處理，否則會對 CKD 病人說「腎臟尚未受影響」。
 */
export function decideTopics(facts: PatientFacts): TopicDecision[] {
  const decisions: TopicDecision[] = [];
  const ckdFlag = facts.comorbidityFlags.ckd;
  const hasCkdFlag = ckdFlag.known && ckdFlag.value;
  const ckdIcdCodes = facts.ckdIcdCodes;
  // 檢驗證據是第三條獨立來源。R3、CKD 欄位、診斷碼都可能同時漏掉同一位病人，
  // 而 eGFR 22.8 這種數字自己就說明了問題。
  const kidneyLabs = kidneyLabEvidence(facts);

  for (let topic = 1; topic <= 6; topic += 1) {
    const r = facts.existingComplications.find((item) => item.code === \`R\${topic}\`);
    const pr = facts.riskPredictions.find((item) => item.code === \`PR\${topic}\`);
    const rPresent = Boolean(r?.present);
    const rValue = rPresent ? (r?.value ?? null) : null;
    const prValue = pr?.present ? pr.value : null;
    const base = {
      topic,
      topicName: TOPIC_NAMES[topic],
      moduleId: TOPIC_TO_MODULE[topic],
      rValue,
      prValue,
    };

    if (rValue !== null && rValue > 0) {
      decisions.push({ ...base, kind: "established", reason: \`R\${topic}=\${rValue}，屬已發生的併發症現況。\` });
      continue;
    }

    // 來源 CKD 欄位與申報診斷碼都是獨立於 DCSI 的既有診斷宣告，優先於 R3 的缺值。
    // DCSI 只認診斷碼，而診斷碼只出現在有開藥的就診，所以 R3 漏掉腎病變的機會不小。
    if (topic === 3 && (hasCkdFlag || ckdIcdCodes.length > 0 || kidneyLabs.triggered)) {
      const basis = hasCkdFlag
        ? "來源 CKD 欄位為 1"
        : ckdIcdCodes.length > 0
          ? \`申報診斷碼出現慢性腎臟病（\${ckdIcdCodes.join("、")}）\`
          : kidneyLabs.reason;
      const labOnly = !hasCkdFlag && ckdIcdCodes.length === 0;
      decisions.push({
        ...base,
        kind: "established",
        provisional: labOnly,
        reason: labOnly
          ? \`\${basis}。資料只有費用年月、沒有採檢日期，無法確認是否持續三個月以上（KDIGO 對慢性腎臟病的定義要求持續三個月以上），因此列為需確認而非確診；衛教內容照納入。\`
          : \`\${basis}，即使 R3\${rPresent ? \`=\${rValue}\` : " 缺值"} 也以已發生處理。\`,
      });
      continue;
    }

    // 走到這裡代表 R 不存在或為 0（R>0 已在上面判為已發生），兩種情形都是尚未發生。
    if (prValue === PR_HIGH) {
      decisions.push({
        ...base,
        kind: "prevention-active",
        reason: \`來源以 PR\${topic}=\${PR_HIGH}（\${PR_ACTION_TIER[PR_HIGH]}）呈現、未輸出 R\${topic}，依資料模型代表尚未發生；納入預防內容。\`,
      });
      continue;
    }
    if (prValue === PR_MODERATE) {
      decisions.push({
        ...base,
        kind: "prevention-moderate",
        reason: \`PR\${topic}=\${PR_MODERATE}（\${PR_ACTION_TIER[PR_MODERATE]}），尚未發生；納入預防內容。\`,
      });
      continue;
    }
    if (prValue === PR_LOW) {
      decisions.push({
        ...base,
        kind: "excluded",
        reason: \`PR\${topic}=\${PR_LOW}（\${PR_ACTION_TIER[PR_LOW]}），維持既有照護即可，不納入主題內容。\`,
      });
      continue;
    }
    decisions.push({
      ...base,
      kind: "excluded",
      reason: \`來源同時未提供 R\${topic} 與 PR\${topic}，無從判斷是否發生，不得補值，因此不納入。\`,
    });
  }

  return decisions;
}

/**
 * 資料稽核。
 *
 * 這一站原本叫「模組挑選」，要模型排出前三優先項。實測五位病人，把它的輸出
 * 接上與不接上，兩份報告**逐字相同**——因為納入哪些主題由程式依 R／PR 判定，
 * 優先序改不了任何東西，而真正有價值的 clinician_notes 與 data_concerns
 * 則被程式直接丟棄。等於每位病人都付了一次呼叫，然後把有用的部分扔掉。
 *
 * 它丟掉的東西長這樣（實測輸出）：
 *   「基本資料標示『慢性腎臟病：否』，但檢驗紀錄顯示 eGFR 最低曾達 22.8，
 *     資料存在顯著矛盾。」
 * 那正是我們花了好幾輪才手動發現的矛盾，它每次都抓得到。
 *
 * 所以改成專職做資料稽核：拿掉優先序，結果進醫師版。
 */
export const DATA_AUDIT_PROMPT = \`你是糖尿病照護資料的稽核者，讀者是醫療團隊，不是病人。

重要：哪些併發症主題要納入報告、個別化目標與追蹤間隔，**全部已由程式依 R／PR 與指引門檻表判定完成**，你不需要也不能改變。病人可見的衛教正文也由程式以已核准的固定文字組合，你寫的任何文字都不會出現在病人版。

你只做兩件規則做不到的事：

1. **找出資料本身的矛盾與限制**。例如：基本資料的共病旗標與檢驗數值互相矛盾、申報用藥距報告日過久而不能代表目前用藥、關鍵指標完全缺漏、同一項檢驗在不同院所名稱不一致而可能被程式漏抓。
2. **提醒醫療團隊需要人工確認的地方**。以「請確認什麼」的句型寫，不要下結論。

如果你認為程式的主題判定有問題，寫在 disagreements。意見會記錄下來供人工檢視，但不會覆寫程式判定——這個管道曾經抓到程式把缺值當成 0 的真實錯誤。

限制：
- 不得推測資料沒有的診斷、檢驗、日期或目前用藥。
- 申報用藥只代表曾有申報紀錄，不得當成目前正在使用。
- 不得提出停藥、加藥、換藥或調整劑量的建議。
- 每一則都要能指回輸入中的具體欄位或數值，不要寫泛泛的注意事項。

輸出格式：只輸出一個 JSON 物件，不要加說明文字或程式碼圍籬。

{
  "echo": { "age_years": 輸入中的年齡數字, "dcsi": 輸入中的 DCSI 總分（沒有就填 null） },
  "clinician_notes": ["需要醫療團隊確認的事，每則 80 字以內"],
  "data_concerns": ["資料本身的矛盾或限制，每則 80 字以內"],
  "disagreements": [
    { "topic": "R3", "program_decision": "程式的判定", "your_view": "你的看法與理由" }
  ]
}\`;

export type DataAudit = {
  /**
   * 輸入中的年齡與 DCSI，由判讀器抄回來。
   *
   * 輸出檔沒有病人識別碼是刻意的（不把識別資料寫進中介檔），代價是放錯
   * 資料夾不會有任何症狀——實測就發生過兩位病人的輸出對調，而且是靠肉眼
   * 讀出「病程 1.6 年」對不上才發現的。抄回兩個數字就能自動核對。
   */
  echo: { ageYears: number | null; dcsi: number | null } | null;
  clinician_notes: string[];
  data_concerns: string[];
  disagreements: Array<{ topic: string; program_decision: string; your_view: string }>;
};

export function parseDataAudit(raw: string): DataAudit {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/\`\`\`(?:json)?\\s*([\\s\\S]*?)\`\`\`/i);
  const candidate = fenced ? fenced[1].trim() : trimmed;

  let parsed: unknown;
  try {
    parsed = JSON.parse(candidate);
  } catch {
    const first = candidate.indexOf("{");
    const last = candidate.lastIndexOf("}");
    if (first === -1 || last <= first) throw new Error("輔助判讀器沒有回傳可解析的 JSON。");
    parsed = JSON.parse(candidate.slice(first, last + 1));
  }
  if (!parsed || typeof parsed !== "object") throw new Error("輔助判讀器回傳的不是 JSON 物件。");
  const record = parsed as Record<string, unknown>;

  const strings = (value: unknown): string[] =>
    Array.isArray(value) ? value.filter((item) => typeof item === "string").map(String) : [];

  const echoRaw = (record.echo ?? null) as Record<string, unknown> | null;
  const num = (value: unknown) => (typeof value === "number" && Number.isFinite(value) ? value : null);

  return {
    echo: echoRaw ? { ageYears: num(echoRaw.age_years), dcsi: num(echoRaw.dcsi) } : null,
    clinician_notes: strings(record.clinician_notes),
    data_concerns: strings(record.data_concerns),
    disagreements: (Array.isArray(record.disagreements) ? record.disagreements : [])
      .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
      .map((item) => ({
        topic: String(item.topic ?? "").trim(),
        program_decision: String(item.program_decision ?? "").trim(),
        your_view: String(item.your_view ?? "").trim(),
      }))
      .filter((item) => item.topic),
  };
}

export type ResolvedPlan = {
  decisions: TopicDecision[];
  /** 完整展開的併發症主題模組，已排序 */
  topicModuleIds: string[];
  /** 只給簡短提醒的主題 */
  moderateTopics: TopicDecision[];
  selfCareModuleIds: string[];
  selfCareReasons: Record<string, string>;
  /** 給模組文字挑選變體用的成分名 */
  medicationIngredients: string[];
  /** 病人版最終順序（含 BASE 與類型提醒） */
  patientModuleIds: string[];
  targets: ResolvedPlanTargets;
  /** 資料稽核的結果；沒跑或解析失敗時為 null。 */
  audit: DataAudit | null;
  /** LLM 指定但不在已納入清單中的優先項，已被忽略 */
  /** 病人版可讀的檢驗數值敘述（不含時序宣稱、不含筆數） */
  labNotes: string[];
  /** 醫師版：含筆數與結果種類數 */
  labNotesForClinician: string[];
  /** 由實際數值觸發、可給病人看的門檻提醒 */
  labPatientMessages: string[];
  /** 文末數值，每一則帶著它自己的說明，讓病人不必自行配對。 */
  labNoteEntries: Array<{ text: string; messages: string[] }>;
  /** 由實際數值觸發、給醫師看的門檻判定（含數值與出處） */
  labThresholds: ReturnType<typeof evaluateThresholds>;
  /** 共同照護區塊，整份報告各出現一次 */
  sharedBlockIds: string[];
  followUp: ReturnType<typeof followUpSchedule>;
  /** 各主題的就醫警訊，集中成單一清單 */
  urgentSigns: string[];
  /** 目標值與實際檢驗值的逐項比對 */
  targetComparisons: ReturnType<typeof compareToTargets>;
  /** 模組代碼 → 該器官相關的檢驗值敘述，用來嵌進對應段落 */
  labByModule: Record<string, string[]>;
  /** 同上，但每一則帶著它自己的說明。 */
  labEntriesByModule: Record<string, Array<{ text: string; messages: string[] }>>;
  /** 該器官段落建議的檢查項目中，資料裡完全沒有紀錄的那些。 */
  missingByModule: Record<string, string[]>;
  /** 用藥與檢驗資料的時間落差（天）；無法計算時為 null */
  medicationLabGapDays: number | null;
  /** 已納入門檻判定的指標數 */
  evaluatedAnalytes: number;
  /** 已由程式逐條判定的檢驗項目，供判讀器那一段去重 */
  evaluatedAnalyteKeys: string[];
  /** 有數值但未納入判定的檢驗項目種類數 */
  unevaluatedNumericItems: number;
};

export function resolvePlan(audit: DataAudit | null, facts: PatientFacts): ResolvedPlan {
  const decisions = decideTopics(facts);

  const established = decisions
    .filter((item) => item.kind === "established")
    .sort((a, b) => (b.rValue ?? 0) - (a.rValue ?? 0) || a.topic - b.topic);
  const active = decisions
    .filter((item) => item.kind === "prevention-active")
    .sort((a, b) => a.topic - b.topic);
  const moderate = decisions.filter((item) => item.kind === "prevention-moderate").sort((a, b) => a.topic - b.topic);

  // 分型專屬補充模組只有在糖尿病類型明確確認時才附加，且必須跟在對應的 CORE 之後。
  const typeSuffix =
    facts.diabetesType.verdict === "type1-confirmed"
      ? "T1"
      : facts.diabetesType.verdict === "type2-confirmed"
        ? "T2"
        : null;
  const TYPE_VARIANTS: Record<string, string> = {
    "EYE-CORE": "EYE",
    "KIDNEY-CORE": "KIDNEY",
    "NERVE-CORE": "NERVE",
  };

  // PR=1 與 PR=2 都展開完整模組；兩者的差別只留在醫師版與判定路徑的分級標示上。
  const topicModuleIds: string[] = [];
  for (const item of [...established, ...active, ...moderate]) {
    topicModuleIds.push(item.moduleId);
    const prefix = TYPE_VARIANTS[item.moduleId];
    if (typeSuffix && prefix && MODULE_BY_ID.has(\`\${prefix}-\${typeSuffix}\`)) {
      topicModuleIds.push(\`\${prefix}-\${typeSuffix}\`);
    }
  }

  const patientModuleIds: string[] = ["BASE-01"];
  const verdict = facts.diabetesType.verdict;
  if (verdict === "conflicting" || verdict === "absent") patientModuleIds.push("TYPE-UNCLEAR");
  patientModuleIds.push(...topicModuleIds);
  if (topicModuleIds.includes("NERVE-CORE") || topicModuleIds.includes("LEG-CIRCULATION-CORE")) {
    patientModuleIds.push("BASE-02");
  }

  // 檢驗數值：接進門檻判定。沒有採檢日，所以一律以「曾出現」敘述。
  const labFindings = extractLabFindings(facts);
  const labThresholds = evaluateThresholds(labFindings, facts);

  // 計數只有一個來源：主題判定。低血糖模組要看實測值，所以檢驗判定必須先跑。
  const lowestGlucose = lowestMeasuredGlucose(labFindings);
  const selfCare = selectSelfCareModules(facts, established.length, lowestGlucose);

  // 共同照護區塊：由選到的主題決定，整份報告各出現一次。
  const needed = new Set<string>();
  for (const id of topicModuleIds) {
    for (const key of MODULE_BY_ID.get(id)?.needsShared ?? []) needed.add(key);
  }
  const sharedBlockIds = SHARED_CARE_BLOCKS.filter(
    (block) => block.appliesWhen === "always" || needed.has(block.appliesWhen),
  ).map((block) => block.id);

  // 就醫警訊集中；同一份報告裡不重複。
  const urgentSigns: string[] = [];
  for (const id of topicModuleIds) {
    const signs = MODULE_BY_ID.get(id)?.urgentSigns;
    if (signs && !urgentSigns.includes(signs)) urgentSigns.push(signs);
  }
  for (const id of selfCare.moduleIds) {
    const signs = SELF_CARE_BY_ID.get(id)?.urgentSigns;
    if (signs && !urgentSigns.includes(signs)) urgentSigns.push(signs);
  }

  const includedTopics = [...established, ...active].map((item) => item.topic);
  const targetComparisons = compareToTargets(labFindings, facts);

  // 把檢驗值嵌進對應的器官段落。稽核指出數值全放在文末附錄時，
  // 病人必須自己把「數值」和「建議」兩段對照，等於把工作丟回去。
  const labByModule: Record<string, string[]> = {};
  const labEntriesByModule: Record<string, Array<{ text: string; messages: string[] }>> = {};
  const inlined = new Set<string>();
  for (const finding of labFindings) {
    const moduleId = ANALYTE_TO_MODULE[finding.analyte];
    if (!moduleId || !topicModuleIds.includes(moduleId)) continue;
    const text = describeRange(finding);
    (labByModule[moduleId] ??= []).push(text);
    (labEntriesByModule[moduleId] ??= []).push({
      text,
      messages: [
        ...labThresholds
          .filter((hit) => hit.analyte === finding.analyte && hit.patientMessage)
          .map((hit) => hit.patientMessage as string),
        ...targetComparisons
          .filter((item) => item.analyte === finding.analyte && item.outOfTarget && item.patientMessage)
          .map((item) => item.patientMessage as string),
      ],
    });
    inlined.add(finding.analyte);
  }

  // 段落裡教了要看哪些檢查，就要說明哪一項資料中完全沒有——
  // 否則會出現「說您有腎臟問題、只給一個正常的肌酸酐」這種讀不通的組合。
  const missingByModule: Record<string, string[]> = {};
  const measured = new Set(labFindings.map((item) => item.analyte));
  for (const [moduleId, expected] of Object.entries(EXPECTED_ANALYTES)) {
    if (!topicModuleIds.includes(moduleId)) continue;
    const missing = expected.filter((item) => !measured.has(item.analyte)).map((item) => item.label);
    if (missing.length) missingByModule[moduleId] = missing;
  }

  // 用藥申報停在兩年前、檢驗卻是近月，這種落差醫師需要知道。
  let medicationLabGapDays: number | null = null;
  if (facts.medicationDateRange.known && facts.reportDate.known) {
    const latest = Date.parse(\`\${facts.medicationDateRange.value.latest}T00:00:00Z\`);
    const report = Date.parse(\`\${facts.reportDate.value}T00:00:00Z\`);
    if (Number.isFinite(latest) && Number.isFinite(report)) {
      medicationLabGapDays = Math.round((report - latest) / 86_400_000);
    }
  }

  return {
    decisions,
    topicModuleIds,
    moderateTopics: moderate,
    selfCareModuleIds: selfCare.moduleIds,
    selfCareReasons: selfCare.reasons,
    medicationIngredients: facts.medicationIngredients,
    patientModuleIds,
    targets: resolveTargets(facts, established.length),
    audit,
    // 已經嵌進器官段落的就不在文末摘要重複一次。
    labNotes: labFindings.filter((f) => !inlined.has(f.analyte)).map(describeRange),
    labNotesForClinician: labFindings.map(describeRangeForClinician),
    labPatientMessages: labThresholds
      .map((hit) => hit.patientMessage)
      .filter((message): message is string => Boolean(message)),
    // 輕重之分靠排序表達，不靠在前面加一個摘要區塊。
    // 摘要區塊只會列出「血鈉異常」這種病人看不懂又無從行動的臨床名詞，
    // 而且緊接著的資料限制說明會立刻否定它。
    labNoteEntries: labFindings
      .filter((f) => !inlined.has(f.analyte))
      .map((f) => {
        // 說明有兩個來源：門檻判定與目標比對。先前只配對前者，導致
        // 「飯前血糖 20–315」底下沒有說明，而說明掉到區塊最後變成孤兒。
        const hits = labThresholds.filter((hit) => hit.analyte === f.analyte && hit.patientMessage);
        const offTarget = targetComparisons.filter(
          (item) => item.analyte === f.analyte && item.outOfTarget && item.patientMessage,
        );
        const messages = [
          ...hits.map((hit) => hit.patientMessage as string),
          ...offTarget.map((item) => item.patientMessage as string),
        ];
        return {
          text: describeRange(f),
          messages,
          rank: hits.some((hit) => hit.severity === "urgent") ? 0 : messages.length ? 1 : 2,
        };
      })
      .sort((a, b) => a.rank - b.rank)
      .map(({ text, messages }) => ({ text, messages })),
    labThresholds,
    sharedBlockIds,
    targetComparisons,
    labByModule,
    labEntriesByModule,
    missingByModule,
    medicationLabGapDays,
    evaluatedAnalytes: labFindings.length,
    evaluatedAnalyteKeys: labFindings.map((item) => item.analyte),
    unevaluatedNumericItems: facts.labItems.filter(
      (item) => item.rawValues.some((v) => /^[≧≥><＞＜]?\\s*\\d/.test(v.trim())),
    ).length - labFindings.length,
    followUp: followUpSchedule(includedTopics, {
      kidneyIntensive: labThresholds.some((hit) => hit.code === "kidney-intensive-followup"),
          type1: facts.diabetesType.verdict === "type1-confirmed",
    }),
    urgentSigns,
  };
}

function draftBanner(narrative = false): string[] {
  const extra = narrative
    ? ["※ 本報告的「觀察摘要」「短期建議」「中期目標」三段由模型直接撰寫，未經醫療團隊逐句核准；數值已由程式逐一比對來源，目標值取自指引門檻表。"]
    : [];
  if (MODULE_CATALOG_APPROVED) return extra.length ? [...extra, ""] : [];
  return [
    \`※ DRAFT｜衛教模組 \${MODULE_CATALOG_VERSION}／自我照護模組 \${SELF_CARE_VERSION}／指引門檻表 \${RULES_VERSION} 均尚未經醫療團隊核准，僅供流程比較，不得提供給病人。\`,
    ...extra,
    "",
  ];
}

/**
 * 中風險主題的一句話提醒。
 *
 * 先前這一區只印病名，讀者拿到「1. 腦血管疾病 2. 心血管疾病」加一句免責聲明——
 * 製造焦慮又不給出路。列出一個項目就要能回答「那我該做什麼」。
 */
/**
 * 各器官段落「應該要有」的檢查項目。資料中完全沒有紀錄時要講出來，
 * 因為那本身就是一件病人可以在回診時處理的事。
 */
const EXPECTED_ANALYTES: Record<string, Array<{ analyte: Analyte; label: string }>> = {
  "KIDNEY-CORE": [
    { analyte: "UACR", label: "尿液白蛋白／肌酸酐比值（UACR）" },
    { analyte: "creatinine", label: "血清肌酸酐" },
    { analyte: "eGFR", label: "腎絲球過濾率（eGFR）" },
  ],
};



export type AssembleOptions = {
  /**
   * 這份報告實際產出的日期，由呼叫端給（通常是今天）。
   *
   * 不可用來源的 REPORT_DATE 代替。那是資料匯出當時的日期，會讓一份今天
   * 產出的報告顯示成十幾天前做的，而病人版還要讀者「請先查看資料截至日期」——
   * 兩個日期一樣就等於沒有給任何資訊。
   */
  reportDate: string | null;
  /** 資料的截止日，來自來源的 REPORT_DATE。 */
  dataCutoff: string | null;
  /** 檢驗判讀器的輸出；未執行時省略。只影響醫師版。 */
  labReview?: LabReviewCheck;
  /**
   * 病人版的檢驗敘述；未執行時省略，改用程式組出的固定句型。
   *
   * 這是報告中唯一一段未經逐句核准的文字。程式驗證它引用的數值與禁止事項，
   * 但不改寫它——判定是它的職責。
   */
  labNarrative?: LabNarrativeCheck;
};

/**
 * 安全提示的分級標籤。
 *
 * 內部鍵值沿用 info／attention／urgent（排序要用），但**印出來的字不能暗示即時性**。
 * 這些數值全部來自沒有採檢日的申報資料——一筆 Na 124 可能是兩年前住院時測的、
 * 早就處理完了。標成「urgent」等於要醫師對一個可能已經不存在的狀況立刻反應。
 *
 * 分級真正的意思是「該優先核實哪一項目前狀態」，不是「現在有多急」。
 */
const SEVERITY_LABEL: Record<"info" | "attention" | "urgent", string> = {
  urgent: "優先核實",
  attention: "留意",
  info: "參考",
};

/**
 * 三個標題層級要一眼分得出來，否則「腦血管」和「掌握自己的數字」看起來
 * 是同一種東西——前者是你的狀況，後者是要做的事。
 *
 *   ──── 分隔線＋【】  區塊
 *   ◆                  模組
 *   1. 2. 3.／・        內容（指令／資訊）
 */
function section(lines: string[], title: string) {
  lines.push("────────────────────────────────", \`【\${title}】\`, "");
}

/**
 * 病人版：逐字使用固定文字，不出現代碼、分數或高／中／低風險標籤。
 *
 * 結構經過一次重整：主題模組只放該疾病特有的內容，通用照護、追蹤時程與
 * 就醫警訊各集中一次，避免六個模組串起來後同一件事講六遍。
 */
export function assemblePatientReport(plan: ResolvedPlan, options: AssembleOptions): string {
  const lines: string[] = [...draftBanner(Boolean(options.labNarrative))];

  lines.push("糖尿病衛教報告");
  lines.push(\`報告產生日期：\${options.reportDate ?? "未提供"}\`);
  lines.push(\`資料截至日期：\${options.dataCutoff ?? "未提供"}\`);
  lines.push("");

  const byId = new Map(plan.decisions.map((item) => [item.moduleId, item]));
  /**
   * suffix：狀態直接寫在標題上。
   * 區塊開頭那句「以下是已經有的狀況」在第 17 行，讀到第 45 行的「腎臟」時
   * 已經隔了 30 行，而器官名本身是中性的——單看標題分不出是「你已經有」
   * 還是「你要預防」。
   *
   * merged：分型補充模組（EYE-T2 等）原本各自起一個「第二型糖尿病眼底檢查補充」
   * 標題，讀起來像文件章節編號而不是對病人說話。改為併進母模組的內文。
   */
  // 有 LLM 敘述時，數值全部集中在那一段；器官段落不再嵌入，否則同一個 eGFR
  // 會用兩種語氣講兩次。缺檢提示保留——那是程式知道而敘述器不知道的事
  // （它只描述存在的紀錄，不知道「該有而沒有」）。
  const inlineValues = !options.labNarrative;
  const emit = (id: string, suffix = "", merged: string[] = []) => {
    const moduleDef = MODULE_BY_ID.get(id);
    if (!moduleDef) return;
    lines.push(\`◆ \${moduleDef.title}\${suffix}\`, "");
    lines.push(moduleDef.patientText, "");
    for (const extra of merged) lines.push(extra, "");
    // 相關數值直接放在該器官段落，病人不必自己回頭對照文末附錄。
    const entries = inlineValues ? plan.labEntriesByModule[id] : undefined;
    if (entries?.length) {
      // 時間限制在報告開頭講過一次，這裡不重複，否則每個器官段落都會再唸一遍。
      // 標題帶上器官名，才不會和文末的「您的其他檢驗數值」撞名。
      lines.push(\`您的\${moduleDef.title}相關數值：\`, "");
      // 數值是資訊、不是待辦。用「・」和行動項目的「1. 2. 3.」區隔，
      // 否則同一份報告裡「1. 血糖 55–459」和「1. 每天查看腳背」讀起來是同一種東西。
      entries.forEach((entry) => {
        lines.push(\`・\${entry.text}\`);
        for (const message of entry.messages) lines.push(\`   \${message}\`);
      });
      lines.push("");
    }
    const missing = inlineValues ? plan.missingByModule[id] : undefined;
    if (missing?.length) {
      lines.push(\`您的資料中沒有\${missing.join("、")}的紀錄。回診時可以確認是否需要安排。\`, "");
    }
  };

  for (const id of ["BASE-01", "TYPE-UNCLEAR"]) {
    if (plan.patientModuleIds.includes(id)) emit(id);
  }

  // 檢驗資料的時間限制整份報告只講一次，之後各處直接列數值。
  const hasAnyValues = plan.labNotes.length > 0 || Object.keys(plan.labByModule).length > 0;
  if (hasAnyValues) {
    lines.push(
      "以下提到的檢驗數值都來自健保申報紀錄。這些紀錄只有費用年月、沒有檢查日期，因此無法確認先後順序，也無法確認哪一筆最新。",
      "",
    );
  }



  const topicIds = plan.patientModuleIds.filter((id) => !["BASE-01", "TYPE-UNCLEAR"].includes(id));
  /**
   * 已發生與預防不分區。
   *
   * R 欄位來自我們看不到推導方式的來源倉儲，分成「您已有的」與「預防的」
   * 兩區等於要病人自己去想「我到底有沒有」——而那個問題我們答不了。
   * 該給的衛教照給，順序上已發生的排前面，但不標示狀態。
   */
  const orderedIds: string[] = [];
  // 順序：已發生排前面，其次積極照護，再來適度介入。三種都會展開完整模組。
  for (const kind of ["established", "prevention-active", "prevention-moderate"] as const) {
    for (const id of topicIds) {
      if (/-T[12]$/.test(id)) continue;
      const decision = byId.get(id);
      const parent = decision ? null : topicIds.find((other) => byId.get(other) && id.startsWith(other.split("-")[0]));
      const actual = decision?.kind ?? (parent ? byId.get(parent)?.kind : undefined);
      if (actual !== kind) continue;
      orderedIds.push(id);
    }
  }


  if (options.labNarrative) {
    // LLM 直接寫的連貫段落。固定句型只涵蓋程式有規則的項目，而且會把
    // 「曾出現偏低」與「曾出現偏高」並排成兩句，要讀者自己合起來想。
    section(lines, "觀察摘要：您的檢驗數值");
    lines.push(...formatLabNarrative(options.labNarrative), "");
  } else {
  // 沒有配對到任何數值的提醒（例如「資料中沒有 HbA1c 紀錄」、低血糖跨了兩種
    // 血糖項目）也必須印出來。先前整段包在 labNoteEntries.length 裡，數值全部
    // 被嵌進器官段落時 labNoteEntries 是空的，這些提醒就跟著消失了。
    const pairedMessages = new Set([
      ...plan.labNoteEntries.flatMap((entry) => entry.messages),
      ...Object.values(plan.labEntriesByModule).flatMap((entries) => entries.flatMap((entry) => entry.messages)),
    ]);
    const looseMessages = [
      ...plan.labPatientMessages.filter((message) => !pairedMessages.has(message)),
      ...outOfTargetOnly(plan.targetComparisons)
        .map((item) => item.patientMessage)
        .filter((message): message is string => Boolean(message))
        .filter((message) => !pairedMessages.has(message)),
    ];

    if (plan.labNoteEntries.length || looseMessages.length) {
      section(lines, "觀察摘要：您的其他檢驗數值");
      plan.labNoteEntries.forEach((entry) => {
        lines.push(\`・\${entry.text}\`);
        for (const message of entry.messages) lines.push(\`   \${message}\`);
      });
      if (plan.labNoteEntries.length) lines.push("");
      for (const message of looseMessages) lines.push(message, "");
    }
  }

  // 短期建議：LLM 與觀察摘要同一次呼叫產生，屬於個人化內容。
  // 模型沒回這一段就整段不印——寧可少一節，也不要放一段沒人寫過的空話。
  if (options.labNarrative?.shortTerm) {
    section(lines, "短期建議：這一兩週可以開始做的事");
    lines.push(options.labNarrative.shortTerm, "");
  }

  /**
   * 中期目標。
   *
   * 這一段本來只在醫師版有，病人版看不到自己要往哪裡走——只知道現在的數值，
   * 不知道該落在哪裡、什麼時候再驗。目標值與出處都取自門檻表，不是模型生成的。
   *
   * 追蹤間隔併進來：目標與「什麼時候再驗一次」分成兩段的話，病人得自己配對。
   */
  const patientTargets = plan.targets.targets.filter((item) => item.value && !item.needsClinicianConfirmation);
  if (options.labNarrative?.midTerm || patientTargets.length || plan.followUp.text) {
    section(lines, "中期目標：下一階段要達到的數字");
    // 目標數字一律出自門檻表。LLM 拿到的就是下面這份清單，它只負責寫成病人的話——
    // 讓模型自己訂目標值會失去可追溯性，也可能跟醫師版對不上。
    if (options.labNarrative?.midTerm) {
      lines.push(options.labNarrative.midTerm, "");
    } else if (patientTargets.length) {
      // 出處只在這裡講一次。逐條掛〔章表，p.頁次〕會把頁碼變成病人版追溯不到的
      // 裸數字，而且對病人沒有意義——要回查的是醫師，醫師版本來就逐條附了。
      lines.push("以下是依中華民國糖尿病學會指引、對照您的狀況推出的控制目標。實際數字仍以醫療團隊的評估為準。", "");
      for (const target of patientTargets) {
        const rule = target.ruleId ? RULES_BY_ID.get(target.ruleId) : undefined;
        lines.push(\`◆ \${target.metric}：\${rule?.patientStatement ?? target.value}\`, "");
      }
    }
    // LLM 版的中期目標已經把追蹤時間寫進去了（那份間隔也是餵給它的材料之一），
    // 再印一次就是同一件事講兩遍。
    if (!options.labNarrative?.midTerm && plan.followUp.text) {
      lines.push("下次檢查的建議時間：", "");
      lines.push(plan.followUp.text, "");
    }
  }

  // 「照護重點」與「每天可以做的事」是我們的內部分類（跨主題共用區塊 vs
  // DSMES 自我照護模組），不是病人的分類——兩區都是「要做的事」，分成兩塊
  // 只會讓人以為有什麼差別。合成一區。
  if (orderedIds.length) {
    // 有些主題是風險預測選進來的。原本這句話掛在「持續留意」那一區，
    // 那一區併進來之後若不補回來，病人會把預測讀成已經確診。
    const fromPrediction = orderedIds.some((id) => {
      const decision = byId.get(id) ?? byId.get(topicIds.find((other) => id.startsWith(other.split("-")[0])) ?? "");
      return decision?.kind === "prevention-active" || decision?.kind === "prevention-moderate";
    });
    section(lines, "併發症風險：與您有關的健康重點");
    lines.push(
      "以下項目依您的健康紀錄挑選。若不確定自己是否有相關診斷，請回診時向醫療團隊確認。",
      ...(fromPrediction
        ? ["其中有些來自風險評估而非診斷，列出是為了提早注意，不代表您已經有這個疾病。"]
        : []),
      "",
    );
    for (const id of orderedIds) {
      const extras = topicIds
        .filter((other) => /-T[12]$/.test(other) && other.split("-")[0] === id.split("-")[0])
        .map((other) => MODULE_BY_ID.get(other)?.patientText)
        .filter((text): text is string => Boolean(text));
      emit(id, "", extras);
    }
  }

  if (plan.sharedBlockIds.length || plan.selfCareModuleIds.length) {
    section(lines, "預防叮嚀：日常照護");
    for (const id of plan.sharedBlockIds) {
      const block = SHARED_CARE_BLOCKS.find((item) => item.id === id);
      if (!block) continue;
      lines.push(\`◆ \${block.title}\`, "");
      lines.push(block.text, "");
    }
    const kidneyOrHeart = plan.decisions.some(
      (item) => item.kind === "established" && (item.topic === 3 || item.topic === 5),
    );
    const ingredients = plan.medicationIngredients.join(" ");
    const active: Record<string, boolean> = {
      "kidney-or-heart": kidneyOrHeart,
      "sick-day-hold-drugs": /metformin|雙胍|gliflozin/i.test(ingredients),
      sglt2: /gliflozin/i.test(ingredients),
    };
    for (const id of plan.selfCareModuleIds) {
      const moduleDef = SELF_CARE_BY_ID.get(id);
      if (!moduleDef) continue;
      let text = moduleDef.patientText;
      let changed = false;
      for (const variant of moduleDef.definiteVariants ?? []) {
        if (!active[variant.when]) continue;
        text = text.replace(variant.from, variant.to);
        changed = true;
      }
      if (changed) text = renumber(text);
      lines.push(\`◆ \${moduleDef.title}\`, "");
      lines.push(text, "");
    }
  }

  /*
   * 就醫警訊放在最後。
   *
   * 先前放在最前面，理由是「唯一延誤會造成傷害的內容」。改成最後是資料負責人的
   * 決定：個人化的內容（觀察摘要、短期建議、中期目標）才值得排前面，模組型的
   * 通用衛教網路上就找得到。取捨要記著——病人沒讀完就放下時，紅旗清單是最先漏掉的。
   */
  if (plan.urgentSigns.length) {
    section(lines, "什麼情況要立刻就醫");
    // 分兩組。先前是一串 1–9，要逐條讀完才知道哪幾條該打 119。
    // 「儘速就醫；若呼吸困難明顯再打 119」這種混合式的主要指示是儘速就醫，
    // 放進 119 那組會誇大。只有整條就是叫人打 119 的才算。
    const needs119 = (text: string) => /119/.test(text) && !/儘速就醫|當天/.test(text);
    const groups: Array<[string, string[]]> = [
      ["立即撥打 119", plan.urgentSigns.filter(needs119)],
      ["儘速就醫", plan.urgentSigns.filter((item) => !needs119(item))],
    ];
    for (const [title, items] of groups) {
      if (!items.length) continue;
      lines.push(\`◆ \${title}\`, "");
      items.forEach((item, index) => lines.push(\`\${index + 1}. \${item}\`, ""));
    }
  }

  return lines.join("\\n").trimEnd();
}

/** 醫師版：含 DCSI、R1–R7、PR1–PR7 代碼與分數（法規要求），以及個別化目標與安全旗標。 */
/**
 * 條列重新編號。變體會插入或移除條目，直接沿用原文的數字會撞號
 * （實測出現過 1, 2, 2, 3, 4, 4）。
 */
function renumber(text: string): string {
  let n = 0;
  return text
    .split("\\n")
    .map((line) => (/^\\d+\\.\\s/.test(line) ? line.replace(/^\\d+\\.\\s/, \`\${++n}. \`) : line))
    .join("\\n");
}

const DIABETES_TYPE_LABEL: Record<PatientFacts["diabetesType"]["verdict"], string> = {
  "type1-confirmed": "診斷碼指向第 1 型",
  "type2-confirmed": "第 2 型",
  conflicting: "⚠ 第 1 型與第 2 型診斷碼並存",
  absent: "資料中無糖尿病診斷碼",
};

export function assembleClinicianReport(plan: ResolvedPlan, facts: PatientFacts, options: AssembleOptions): string {
  const lines: string[] = [...draftBanner()];

  lines.push("【AI 醫療人員報告】");
  lines.push(\`報告產生日期：\${options.reportDate ?? "未提供"}\`);
  lines.push(\`資料截至日期：\${options.dataCutoff ?? "未提供"}\`);
  lines.push(\`年齡：\${facts.ageYears.known ? \`\${facts.ageYears.value} 歲\` : "未提供"}｜性別：\${facts.sex.known ? facts.sex.value : "未提供"}｜糖尿病病程：\${facts.diabetesDurationYears.known ? \`\${facts.diabetesDurationYears.value} 年\` : "未提供"}\`);
  lines.push("");

  const NUM = ["一", "二", "三", "四", "五", "六", "七", "八"];
  let sectionNo = 0;
  const section = (title: string) => \`\${NUM[sectionNo++]}、\${title}\`;

  lines.push(section("併發症現況與風險預測"));
  lines.push(\`DCSI 總分：\${facts.dcsiTotal.known ? facts.dcsiTotal.value : "來源未提供"}\`);
  const rByTopic = new Map(facts.existingComplications.map((item) => [item.code.slice(1), item]));
  const prByTopic = new Map(facts.riskPredictions.map((item) => [item.code.slice(2), item]));
  const kindByTopic = new Map(plan.decisions.map((item) => [String(item.topic), item.kind]));
  const topics = Object.keys(TOPIC_NAMES).map(Number).sort((a, b) => a - b);
  const width = Math.max(...topics.map((topic) => TOPIC_NAMES[topic].length));
  for (const topic of topics) {
    const key = String(topic);
    const r = rByTopic.get(key);
    const pr = prByTopic.get(key);
    let state: string;
    if (r?.present) {
      state = \`已發生（嚴重度 \${r.rawValue}）\`;
    } else if (kindByTopic.get(key) === "established") {
      /*
       * 用該主題實際的判定理由，不要固定寫「依來源 CKD 註記」。
       * 腎臟主題有三條覆寫來源（CKD 欄位／申報診斷碼／檢驗證據），寫死一條
       * 等於對另外兩條說謊——醫師照著去查 CKD 欄位會發現它是 0。
       */
      const decision = plan.decisions.find((entry) => String(entry.topic) === key);
      const prefix = decision?.provisional ? "需確認" : "已發生";
      state = \`\${prefix}（\${decision?.reason ?? "本項未輸出嚴重度"}）\`;
    } else if (pr?.present && pr.value !== null) {
      state = \`未發生｜風險預測：\${PR_ACTION_TIER[pr.value] ?? "未定義分級"}\`;
    } else {
      state = "來源未提供現況與風險預測";
    }
    lines.push(\`  \${TOPIC_NAMES[topic].padEnd(width, "　")}  \${state}\`);
  }
  lines.push("  （來源對每一項只輸出其一：已發生者給嚴重度分數，未發生者給風險預測。）");
  lines.push("");

  // 只在類型有疑義時提出來。判定為第二型是常態，寫出來只是佔版面。
  if (facts.diabetesType.verdict !== "type2-confirmed") {
    lines.push(section("糖尿病類型"));
    lines.push(\`  \${DIABETES_TYPE_LABEL[facts.diabetesType.verdict]}｜\${facts.diabetesType.note}\`);
    const icd = [...facts.diabetesType.type1IcdCodes, ...facts.diabetesType.type2IcdCodes];
    if (icd.length) lines.push(\`  相關診斷碼：\${icd.join("、")}\`);
    lines.push("");
  }

  // 只列推導得出的目標值。推導依據、出處與「需醫療團隊確認」這類警語刻意不印——
  // 這是給醫師看的報告，目標值本來就由他決定，把程式的推理過程貼上去只是雜訊。
  // 目標名稱也用檢驗報告的縮寫，和第四節一致。
  const METRIC_LABEL: Record<string, string> = {
    血壓: "BP",
    低密度脂蛋白膽固醇: "LDL-C",
    高密度脂蛋白膽固醇: "HDL-C",
    三酸甘油酯: "TG",
    糖化血色素: "HbA1c",
    空腹血糖: "Glucose AC",
    餐後血糖: "Glucose PC",
  };
  const decided = plan.targets.targets.filter((item) => item.value);
  if (decided.length) {
    lines.push(\`\${section("依指引推導的個別化目標")}　來源：\${RULES_SOURCE}\`);
    for (const item of decided) {
      const rule = item.ruleId ? RULES_BY_ID.get(item.ruleId) : undefined;
      lines.push(\`  \${METRIC_LABEL[item.metric] ?? item.metric}：\${rule?.targetValue ?? item.value}\${rule ? \`　〔\${citationShort(rule)}〕\` : ""}\`);
    }
    lines.push("");
  }

  // 追蹤間隔是醫師要開單的依據，先前只出現在病人版，而且病人版用的是
  // 白話說法（「每年做一次足部感覺檢查」）。醫師版用原本的事實陳述並附出處。
  if (plan.followUp.rules.length) {
    lines.push(section("依指引的追蹤間隔"));
    lines.push(...followUpForClinician(plan.followUp.rules));
    lines.push("");
  }

  // 只保留病人特有的安全提示。申報資料的通則性限制（檢驗只有費用年月、申報用藥
  // 不等於目前用藥等）刻意不列——那些每份報告都一樣，醫師本來就知道，列了只是雜訊。
  const disagreements = plan.audit?.disagreements ?? [];
  const offTarget = outOfTargetOnly(plan.targetComparisons);
  if (plan.targets.safetyFlags.length || plan.labThresholds.length || offTarget.length || disagreements.length) {
    lines.push(section("需核實的檢驗結果"));
    // 依嚴重度排，不依插入順序——先前 [參考] 會排在 [優先核實] 前面。
    const RANK = { urgent: 0, attention: 1, info: 2 } as const;
    const rows: Array<{ severity: "info" | "attention" | "urgent"; text: string }> = [];
    for (const item of offTarget) {
      rows.push({
        severity: item.severity,
        text: \`\${item.clinicianMessage}\${item.citationShort ? \`　〔\${item.citationShort}〕\` : ""}\`,
      });
    }
    // 由實際數值觸發的門檻判定排在最前面，因為它們最具體。
    for (const hit of plan.labThresholds) {
      const rule = hit.ruleId ? RULES_BY_ID.get(hit.ruleId) : undefined;
      rows.push({
        severity: hit.severity,
        text: \`\${hit.clinicianMessage}\${rule ? \`　〔\${citationShort(rule)}〕\` : ""}\`,
      });
    }
    // 帶實際數值的判定已經涵蓋通則版本，兩則並列等於同一件事講兩次。
    // 具體那則（帶實際數值）涵蓋通則版；完全沒有 HbA1c 時談它可不可信也沒有意義。
    const supersededFlags =
      plan.labThresholds.some((hit) => hit.code === "hba1c-unreliable" || hit.code === "hba1c-missing")
        ? new Set(["hba1c-reliability"])
        : new Set<string>();
    for (const flag of plan.targets.safetyFlags) {
      if (supersededFlags.has(flag.code)) continue;
      const rule = flag.ruleId ? RULES_BY_ID.get(flag.ruleId) : undefined;
      rows.push({
        severity: flag.severity,
        text: \`\${flag.message}\${rule ? \`　〔\${citationShort(rule)}〕\` : ""}\`,
      });
    }
    rows.sort((a, b) => RANK[a.severity] - RANK[b.severity]);
    for (const row of rows) lines.push(\`  [\${SEVERITY_LABEL[row.severity]}] \${row.text}\`);
    // 稽核對程式判定的異議很少出現；一旦出現就是需要人看的訊號。
    for (const item of disagreements) {
      lines.push(\`  [異議] \${item.topic}｜程式：\${item.program_decision}\`);
      lines.push(\`    LLM：\${item.your_view}\`);
    }
    lines.push("");
  }

  /*
   * 資料稽核的結果。
   *
   * 先前這一整段被程式丟棄——付了一次呼叫的錢，然後把它抓到的東西扔掉。
   * 它實測抓得到「基本資料標示慢性腎臟病：否，但 eGFR 最低曾達 22.8」這種
   * 我們花了好幾輪才手動發現的矛盾。
   *
   * 放在最後：這些是需要人工判斷的線索，不是可以直接照做的結論，
   * 排在程式判定之前會喧賓奪主。
   */
  const auditNotes = plan.audit?.clinician_notes ?? [];
  const auditConcerns = plan.audit?.data_concerns ?? [];
  if (auditNotes.length || auditConcerns.length) {
    lines.push(section("資料稽核（由模型提出，未經程式驗證）"));
    for (const note of auditNotes) lines.push(\`  [請確認] \${note}\`);
    for (const concern of auditConcerns) lines.push(\`  [資料疑慮] \${concern}\`);
    lines.push("");
  }

  // 檢驗結果合併成一節。分成「程式依指引判的」與「判讀器判的」兩節，
  // 會讓血鈉、血鉀、血糖在同一份報告出現兩次——來源不同，但醫師看到的是同一個數字。
  if (plan.labNotesForClinician.length || options.labReview) {
    lines.push(section("檢驗結果"));
    if (plan.labNotesForClinician.length) {
      lines.push("  依指引門檻表逐條判定的核心指標：");
      for (const note of plan.labNotesForClinician) lines.push(\`  \${note}\`);
    }
    if (options.labReview) {
      lines.push(formatLabReview(options.labReview, new Set(plan.evaluatedAnalyteKeys)));
    }
    lines.push("");
  }

  return lines.join("\\n").trimEnd();
}

/** 舊名保留，供既有呼叫端使用。 */
export const assembleClinicianTrace = assembleClinicianReport;

export { EDUCATION_MODULES };

/** 把程式已完成的主題判定寫成文字，讓輔助判讀器知道哪些已納入。 */
export function decisionsForPrompt(plan: ResolvedPlan): string {
  const lines: string[] = ["【程式已完成的主題判定（不可更改）】"];
  for (const item of plan.decisions) {
    const label =
      item.kind === "established"
        ? (item.provisional ? "已納入・需確認" : "已納入・已發生")
        : item.kind === "prevention-active"
          ? "已納入・積極照護"
            : item.kind === "prevention-moderate"
              ? "已納入・適度介入"
              : "未納入";
    lines.push(\`\${item.moduleId}（R\${item.topic} \${item.topicName}）：\${label}｜\${item.reason}\`);
  }
  lines.push("", "【程式已納入的自我照護模組】");
  for (const id of plan.selfCareModuleIds) lines.push(\`\${id}：\${plan.selfCareReasons[id] ?? ""}\`);
  lines.push("", "【程式推導的個別化目標】");
  for (const item of plan.targets.targets) {
    lines.push(\`\${item.metric}：\${item.value ?? "需醫療團隊定案"}（\${item.reason}）\`);
  }
  if (plan.targets.undetermined.length) {
    lines.push("", "【資料不足無法判定】");
    for (const item of plan.targets.undetermined) lines.push(\`- \${item}\`);
  }
  return lines.join("\\n");
}
`,Ae=`/**
 * 檢驗判讀：由 LLM 直接讀原始申報紀錄判斷異常。
 *
 * 為什麼是 LLM 而不是規則：健保申報的檢驗資料很髒。實測五位病人 9,001 筆紀錄，
 * 16.3% 的單位是 \`無\`／\`NIL\`／\`N\` 這類佔位字、16.1% 的值不是數字、29.1% 沒有可用
 * 參考值、還有亂碼項目名稱。參考值有 5 種寫法、值有 5 種形態。
 *
 * 更關鍵的是「不知道自己不知道」：開發過程中規則式解析連續踩了四個坑
 * （Sugar(One touch) 整批漏抓、\`[7-25][7-25]\` 被讀成 7~7、尿液 WBC 與血液 WBC
 * 併成同一項、eAG 換算值被當成實測血糖），每一個都是事後才發現，而其中一個是
 * 安靜地判錯而不是安靜地漏掉。3000 位病人不會有人去核對。
 *
 * 所以判定交給 LLM。程式只做一件不涉及判斷的事：**驗證它引用的數值與項目名稱
 * 確實出現在來源裡**。那是抄寫檢查，不是重新判讀——因為在這個量級，唯一比
 * 「漏掉」更糟的是「看起來合理但不存在的數字」。
 */

import { analyteForItemName } from "./lab-findings.ts";
import type { LabItemFact, PatientFacts } from "./patient-facts.ts";

export const LAB_REVIEW_PROMPT = \`你是協助整理檢驗報告的助手，讀者是忙碌的醫師。

輸入分兩部分：先是這位病人的基本資料（含性別 gender 與生日 birthday，以及已發生併發症 R 與風險預測 PR 的原始欄位），接著是健保申報檢驗紀錄原文，每一筆包含項目名稱、數值、單位與來源提供的參考值。

輸入不含用藥資料。不要推測或提及任何藥物。

請直接讀這些紀錄，判斷哪些項目異常，並整理成醫師 60 秒內看得完的形式。

**只列出與糖尿病長期照護有關的異常。**判斷標準有兩層，兩層都要通過：

第一層，這個異常要跟糖尿病有關——是糖尿病或其併發症造成的、會影響糖尿病治療決策、或會影響糖尿病用藥安全。包括血糖與糖化血色素、腎功能與尿液白蛋白、血脂、肝功能、電解質、與腎病變相關的貧血。

第二層，這個異常要能代表**持續的狀態**，而不是某一次急性事件的當下切片。這批紀錄沒有採檢日期，無法分辨一筆數值是本月測的還是兩年前住院時測的。因此只反映當下急性狀況的項目一律不列，即使數值再誇張：白血球與白血球分類、發炎指標、細菌培養、血液氣體與酸鹼、血液滲透壓、凝血功能。那些沒有時間點就無法判讀，列出來只會讓人誤以為是目前狀態。

其他與糖尿病無關的異常也不要列出：心肌指標、腫瘤標記、甲狀腺功能、與腎病變無關的血液學異常。醫師會另外看那些；放進這份報告只會讓真正要看的東西被淹沒。

判讀原則：
- 以每一筆自己帶的參考值為主要依據。參考值有多種寫法，例如上下限分放兩格、兩格各放整段區間、不等式、或純文字說明；也有很多筆根本沒有參考值。
- 糖尿病人的血糖與糖化血色素要用糖尿病控制目標判讀，不可直接套用健康人的參考範圍。空腹血糖目標 80–130 mg/dL、糖化血色素一般成人低於 7.0%（高齡者依健康狀態放寬）。
- 尿液檢查與血液檢查是不同東西。同名項目（例如 WBC、Glucose）出現在尿液與血液時，判讀依據完全不同，不可混為一談。
- 由 HbA1c 換算出來的估計平均血糖（eAG）不是實測血糖。
- 資料很髒。單位可能是「無」「NIL」這種佔位字、值可能是文字或陰陽性符號、項目名稱可能有亂碼。看不懂的就說看不懂，不要硬猜。

嚴格限制：
- 只能使用輸入中實際出現的項目名稱與數值。每一個數值都會被逐一比對來源，寫出來源沒有的數字會被標記出來。
- worst 欄位只放一個數值。把兩個值寫成一個字串會讓比對失敗，該筆會被標記為不可信。
- 半定量與定性結果（例如尿蛋白 3+、潛血 4+、(-)、Negative）也要判讀，不要因為不是數字就略過。
- 參考值若依年齡或性別分層（例如 [0-14d] … [15-30d] … [≧18y]M 4-5.52 F 3.78-4.99 這種寫法），必須依開頭基本資料的 gender 與 birthday 算出本人的年齡層與性別，取對應的那一段判讀，不要用第一段，也不要兩段都列。判讀理由中要寫出你用的是哪一段。
- 參考值若標註修訂日期（例如「2019/7/1起 ≧18years 變更為 …」），一律以修訂後的區間為準。
- 不得推測診斷，不得提出處置建議。
- 這些紀錄只有費用年月、沒有採檢日期，不得敘述趨勢、先後順序或「最近一次」。
- 數值可能來自兩年前的急性事件，不得當成目前狀態。
- 若某一組看起來是急性事件、檢體條件或資料標示問題而非臨床發現，就直說，不要硬掰意義。

輸出格式：只輸出一個 JSON 物件，不要加說明文字或程式碼圍籬。

{
  "abnormal": [
    {
      "item": "項目名稱，逐字照抄",
      "worst": "最偏離的那一個數值，逐字照抄。只放一個值，不要寫成「A (high) / B (low)」，高低都有時把較嚴重的放這裡、另一個放 worst_other",
      "worst_other": "另一個方向的極值，沒有就填空字串",
      "unit": "單位，沒有就填空字串",
      "reference": "該筆的參考值原文",
      "direction": "high | low | both",
      "why": "為什麼判為異常，30 字以內"
    }
  ],
  "groups": [
    { "system": "系統名稱", "items": ["項目名稱"], "pattern": "一句話描述整體型態，並說明它與糖尿病的關聯" }
  ],
  "worth_a_look": ["值得醫師優先看的組合與理由，每則 60 字以內"],
  "data_quality_notes": ["讀的過程中發現的資料品質問題，每則 60 字以內；沒有則留空陣列"]
}\`;

export type LabAbnormal = {
  item: string;
  worst: string;
  worstOther: string;
  unit: string;
  reference: string;
  direction: string;
  why: string;
};

export type LabReview = {
  abnormal: LabAbnormal[];
  groups: Array<{ system: string; items: string[]; pattern: string }>;
  worth_a_look: string[];
  data_quality_notes: string[];
};

/**
 * 判讀器只拿到項目名稱，分不出檢體。程式知道——醫令 06012C／06013C 是尿液。
 * 「RBC ＞1000 /uL」是血尿，和血液 RBC 並列在同一張表裡會被誤讀。
 */
const URINE_ORDER_CODES = /^(06012C|06013C)$/;

export type LabReviewCheck = {
  review: LabReview;
  /** 引用了來源中找不到的數值 */
  unverifiedValues: LabAbnormal[];
  /** 引用了來源中沒有的項目名稱 */
  unknownItems: string[];
  /** 來源中實際存在的檢驗筆數，用來說明判讀涵蓋範圍 */
  sourceRecords: number;
};

function numeric(raw: string): string | null {
  const match = String(raw).trim().match(/-?\\d+(?:\\.\\d+)?/);
  return match ? String(Number(match[0])) : null;
}

/**
 * 交給判讀器的輸入：基本資料 + 檢驗紀錄，**不含用藥**。
 *
 * 基本資料必須帶：這批資料的參考值是分層的，例如
 * \`[≧18y]M 4-5.52 F 3.78-4.99\`。不知道年齡與性別就選不出該用哪一段，
 * 而 prompt 又要求它選——先前是切在【檢驗與檢查紀錄】，把人口學資料
 * 整塊切掉了，等於下了一條做不到的指令。
 *
 * 用藥刻意不帶：metformin×eGFR 這類連動已經是規則表裡的確定性判定且附出處，
 * 讓判讀器也看到藥會產出第二份同主題意見而無仲裁機制；而且申報用藥可能
 * 停在兩年前，會誘導它推理「目前療法」——那正是 prompt 禁止的事。
 * 用藥段也是整份輸入最大的一塊（實測一位病人佔 93%）。
 */
export function labSectionOf(llmText: string): string {
  const start = llmText.indexOf("【檢驗與檢查紀錄】");
  if (start === -1) return "";
  const end = llmText.indexOf("【其他來源的非空紀錄】", start);
  const labs = llmText.slice(start, end === -1 ? undefined : end);

  // 用藥紀錄之前的所有區塊：基本資料、DCSI 與 R/PR、資料來源概況。
  const headerEnd = llmText.indexOf("【用藥紀錄】");
  const header = headerEnd === -1 ? "" : llmText.slice(0, headerEnd).trimEnd();
  return header ? \`\${header}\\n\\n\${labs}\` : labs;
}

/**
 * 解析並驗證 LLM 的判讀。
 *
 * 刻意**不刪除**它判定的異常——判定是它的職責，程式不覆寫。
 * 但引用不存在的數值或項目會被標記出來，讓醫師知道哪幾筆不可信。
 */
export function parseLabReview(raw: string, facts: PatientFacts): LabReviewCheck {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/\`\`\`(?:json)?\\s*([\\s\\S]*?)\`\`\`/i);
  const candidate = fenced ? fenced[1].trim() : trimmed;

  let parsed: unknown;
  try {
    parsed = JSON.parse(candidate);
  } catch {
    const first = candidate.indexOf("{");
    const last = candidate.lastIndexOf("}");
    if (first === -1 || last <= first) throw new Error("檢驗判讀器沒有回傳可解析的 JSON。");
    parsed = JSON.parse(candidate.slice(first, last + 1));
  }
  const record = (parsed ?? {}) as Record<string, unknown>;

  const strings = (value: unknown): string[] =>
    Array.isArray(value) ? value.filter((item) => typeof item === "string").map(String) : [];

  const abnormal: LabAbnormal[] = (Array.isArray(record.abnormal) ? record.abnormal : [])
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
    .map((item) => ({
      item: String(item.item ?? "").trim(),
      worst: String(item.worst ?? "").trim(),
      worstOther: String(item.worst_other ?? "").trim(),
      unit: String(item.unit ?? "").trim(),
      reference: String(item.reference ?? "").trim(),
      direction: String(item.direction ?? "").trim(),
      why: String(item.why ?? "").trim(),
    }))
    .filter((item) => item.item);

  // 來源中實際存在的項目名稱與數值
  const sourceItems = new Set(facts.labItems.map((item) => item.itemName));
  const sourceValues = new Set<string>();
  let sourceRecords = 0;
  for (const item of facts.labItems) {
    for (const value of item.rawValues) {
      sourceRecords += 1;
      const n = numeric(value);
      if (n !== null) sourceValues.add(n);
    }
  }

  // 只檢查「有解析出數字」的引用。定性結果（3+、(-)、Negative）沒有數字可比，
  // 不能因此判為不可信——那是判讀器的職責範圍，不是抄寫問題。
  /*
   * 逐「項目＋數值」比對。只比數值的話，判讀器把 A 項目的數字寫到 B 項目名下
   * 也會通過——病人版那邊實測就發生過血糖 315 被寫成「糖化血色素 315 %」。
   * 名稱比對放寬到雙向包含（判讀器常補中文或括號），但不放寬到「任一項目」。
   */
  const normalise = (text: string) => text.toLowerCase().replace(/[（）()\\[\\]｜|、，,。.\\s_-]/g, "");
  const sourceByItem = facts.labItems.map((entry) => ({
    key: normalise(entry.itemName),
    values: new Set(entry.rawValues.map(numeric).filter((n): n is string => n !== null)),
  }));
  const belongsTo = (itemName: string, n: string) => {
    const key = normalise(itemName);
    if (!key) return false;
    return sourceByItem
      .filter((row) => row.key === key || row.key.includes(key) || key.includes(row.key))
      .some((row) => row.values.has(n));
  };

  const unverifiedValues = abnormal.filter((item) => {
    for (const field of [item.worst, item.worstOther]) {
      if (!field) continue;
      const n = numeric(field);
      if (n !== null && !belongsTo(item.item, n)) return true;
    }
    return false;
  });
  const unknownItems = [...new Set(abnormal.map((item) => item.item).filter((name) => !sourceItems.has(name)))];

  /**
   * 依來源的醫令代碼標出尿液檢體。判讀器只拿到項目名稱，分不出來；程式分得出來。
   *
   * 要連單位一起比對：同一位病人的 RBC 同時存在於血液（x10^6/ul）與尿液（/uL），
   * 只比名稱會把血液那筆也標成尿液。名稱在來源中全部都是尿液時才可以只看名稱。
   */
  const isUrine = (item: LabItemFact) => item.orderCodes.some((code) => URINE_ORDER_CODES.test(code));
  const byName = new Map<string, LabItemFact[]>();
  for (const item of facts.labItems) {
    byName.set(item.itemName, [...(byName.get(item.itemName) ?? []), item]);
  }
  for (const item of abnormal) {
    if (/尿|urine|dipstick/i.test(item.item)) continue;
    const sameName = byName.get(item.item) ?? [];
    if (!sameName.length) continue;
    // 同名可能同時存在於血液與尿液（RBC 就是）。用引用的數值找出是哪一筆——
    // 判讀器的輸出不一定帶單位，但數值一定帶，而抄寫檢查本來就在比對數值。
    const matched = sameName.filter((source) =>
      [item.worst, item.worstOther].some(
        (value) => value && source.rawValues.some((raw) => raw.trim() === value.trim() || numeric(raw) === numeric(value)),
      ),
    );
    const decisive = matched.length ? matched : sameName;
    if (decisive.every(isUrine)) item.item = \`\${item.item}（尿液）\`;
  }

  return {
    review: {
      abnormal,
      groups: (Array.isArray(record.groups) ? record.groups : [])
        .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
        .map((item) => ({
          system: String(item.system ?? "").trim(),
          items: (Array.isArray(item.items) ? item.items : []).map(String),
          pattern: String(item.pattern ?? "").trim(),
        }))
        .filter((item) => item.system),
      worth_a_look: strings(record.worth_a_look),
      data_quality_notes: strings(record.data_quality_notes),
    },
    unverifiedValues,
    unknownItems,
    sourceRecords,
  };
}

/**
 * @param alreadyShown 上一區已經逐條判定過的核心指標，這裡不重複列。
 */
export function formatLabReview(check: LabReviewCheck, alreadyShown: Set<string> = new Set()): string {
  const { review } = check;
  const lines: string[] = [];
  const shown = review.abnormal.filter((item) => {
    const analyte = analyteForItemName(item.item, item.unit || null);
    return !(analyte && alreadyShown.has(analyte));
  });
  lines.push(
    \`  以下由輔助判讀器讀取 \${check.sourceRecords} 筆原始紀錄判定，只列與糖尿病相關且非急性事件當下的異常。\`,
  );

  if (shown.length) {
    for (const item of shown) {
      /*
       * 模型有時把單位寫進 worst（「104 mg/dL」），程式再接一次就變成
       * 「104 mg/dL mg/dL」。實測五位病人共出現 8 次。
       * 已經帶單位的就不要再接。
       */
      const alreadyHasUnit =
        Boolean(item.unit) &&
        item.worst.replace(/\\s+/g, "").toLowerCase().endsWith(item.unit.replace(/\\s+/g, "").toLowerCase());
      const unit = item.unit && !alreadyHasUnit ? \` \${item.unit}\` : "";
      const other = item.worstOther ? \`／另一端 \${item.worstOther}\` : "";
      const flag = check.unverifiedValues.includes(item) ? "  ⚠ 此數值在來源中找不到" : "";
      lines.push(\`  \${item.item}：\${item.worst}\${unit}\${other}（參考 \${item.reference || "來源未提供"}）\${item.why ? \`｜\${item.why}\` : ""}\${flag}\`);
    }
  } else {
    lines.push("  （無其他與糖尿病相關的異常）");
  }

  for (const group of review.groups) {
    lines.push(\`  \${group.system}：\${group.pattern}\`);
  }

  if (review.worth_a_look.length) {
    lines.push("  值得優先看：");
    for (const item of review.worth_a_look) lines.push(\`    - \${item}\`);
  }

  if (review.data_quality_notes.length) {
    lines.push("  判讀器提到的資料品質問題：");
    for (const item of review.data_quality_notes) lines.push(\`    - \${item}\`);
  }

  if (check.unverifiedValues.length || check.unknownItems.length) {
    lines.push("  ⚠ 抄寫檢查：");
    if (check.unverifiedValues.length) {
      lines.push(\`    \${check.unverifiedValues.length} 筆引用的數值在來源中找不到（已於上方逐筆標示）。\`);
    }
    if (check.unknownItems.length) {
      lines.push(\`    來源沒有這些項目名稱：\${check.unknownItems.join("、")}\`);
    }
  }

  return lines.join("\\n");
}
`,H=`/**
 * 病人版的檢驗說明：由 LLM 直接寫成連貫的段落。
 *
 * 為什麼不是固定句子：實測比較過兩種做法。只讓 LLM 從已核准的句子庫挑選與排序，
 * 得到的是把「曾出現偏低」和「曾出現偏高」並排的清單，讀者要自己合起來想；
 * 直接生成則會寫出「同一段期間內同時出現過高與過低，是值得討論的情況」。
 * 而且固定句子只涵蓋我們事先想到的項目——同一位病人的血鎂、血磷、白蛋白、
 * 尿蛋白完全不會被提到，因為程式層沒有對應規則。
 *
 * 代價要說清楚：**這一段文字沒有經過醫療團隊逐句核准**，和報告其他部分不同。
 * 因此草稿橫幅會標示它，而且程式對它做兩件事：
 *
 *   1. 逐一比對它引用的每一個數值確實出現在來源紀錄裡
 *   2. 掃描它有沒有踩到禁止事項（推測診斷、處置建議、聲稱時序）
 *
 * 檢查不會改寫它的文字——判定是它的職責。但不通過的部分會被標記出來，
 * 讓人知道哪幾句不可信。
 */

import { GUIDELINE_RULES } from "./guideline-rules.ts";
import { extractLabFindings, missingCoreAnalytes } from "./lab-findings.ts";
import { labSectionOf } from "./lab-llm.ts";
import type { PatientFacts } from "./patient-facts.ts";

export const LAB_NARRATIVE_PROMPT = \`你要為一位糖尿病人寫「檢驗數值」這一段衛教內容，讀者是病人本人，不是醫療人員。

輸入分三部分：這位病人的基本資料（含性別 gender 與生日 birthday）、健保申報檢驗紀錄原文、以及一份程式初步判定「可能完全沒有紀錄」的核心指標清單。輸入不含用藥資料，不要推測或提及任何藥物。

**那份清單是待你核對的假設，不是事實。** 它是程式用項目名稱比對出來的，而各院的名稱寫法差很多（同一個檢驗可能寫成 Glu-AC、GLU_AC 或血液及體液葡萄糖），程式曾經因此整批漏抓。請你自己在紀錄裡找一遍：確實找不到的才寫進文中；若你在紀錄裡找到了，就不要說它沒做，並把它列進 found_after_all。

寫作原則：
- 依生理系統分段，例如血糖、腎臟、血液、電解質。同一段裡把相關的數值串起來講，不要一項一句。
- **先講結論，數字只用來佐證。** 每一段開頭要先說這組數值代表什麼（穩定、偏高、波動大、需要注意），再舉數字。
- **同一個項目最多舉兩個數字**——通常是最低與最高，或最能說明問題的那一個。逐筆列出所有數值是把資料倒出來，不是摘要，病人讀不下去。多筆數值請改用「介於 X 到 Y 之間」或「多數落在 X 附近，但曾出現 Y」這種寫法。
- 同一項檢驗在不同院所有不同名稱時（例如 Glucose AC、Glucose AC (POCT)、Sugar AC 都是飯前血糖），合併成一項講，不要並列成好幾個名稱。
- 一段以四到六句為度。
- **觀察摘要只描述數值代表什麼，不給行動建議**。要病人做什麼一律留到短期建議那一段，這裡寫了會和後面重複，也容易在沒有足夠資訊時給錯建議。
- 只寫與糖尿病長期照護有關的項目。與糖尿病無關的異常不要寫，即使數值再誇張。
- 只反映某一次急性事件當下狀態的項目不要寫：白血球與白血球分類、發炎指標、細菌培養、血液氣體與酸鹼、凝血功能。這批紀錄沒有採檢日期，寫了會讓人誤以為是目前狀態。
- 參考值若依年齡或性別分層，依基本資料算出本人的年齡層與性別，取對應的那一段判讀。
- 用一般人看得懂的話。醫學縮寫第一次出現時用中文說明。
- 經你核對後確實找不到的核心指標，每一項都要在文中提到，說明那是評估什麼用的、以及可以在回診時確認是否需要安排。缺檢和異常一樣值得病人知道。
- 清單以外的項目不要說「沒有做」——你只需要核對清單上那幾項。
- 不要寫開場白或結語，只寫這一段本身。

嚴格禁止：
- 不得使用輸入中沒有出現的數值。每一個數字都會被逐一比對來源。
- 不得推測診斷，不得寫出任何病名作為結論。
- 不得提出處置建議，不得叫病人開始、停止、調整任何藥物或治療。
- 不得敘述趨勢、先後順序、「最近一次」、「已改善」、「持續惡化」。這批紀錄只有費用年月、沒有採檢日期。
- 不得把數值寫成目前狀態；數值可能來自兩年前的急性事件。

除了「觀察摘要」，你還要寫兩段：

**短期建議**：病人這一兩週內就能開始做的事，側重生活形態調整與用藥安全提醒。**用編號清單，一點一個動作**，寫清楚做什麼、什麼時候做，不要寫「注意飲食」這種沒有動作的句子，也不要寫成一整段文字。用藥只能提「安全提醒」——例如生病無法進食時哪類藥要先與醫療團隊確認——不得叫病人自行開始、停止或調整任何藥物。

**不得自訂任何具體的攝取量或運動處方**：毫升、公克、大卡、分鐘、公斤、次數都不行。這些對不同病人可能相反——例如腎功能不全的人水分、蛋白質、鹽分與鉀往往需要限制而非補充，寫「每日喝 1500–2000 毫升」對他們可能有害。要提這類事情，請寫成「請醫療團隊或營養師為您訂出適合的份量」。

**中期目標**：下一階段（約三個月至下次回診）要達到的控制指標。輸入會給你一份「程式依指引推出的目標值」，**目標數字一律照抄那份清單，不得自己訂、不得換算、不得補上清單沒有的指標**。你的工作是把它寫成病人的話，並依這位病人的檢驗數值說明離目標還有多遠。清單是空的就不要編。

比較時的說法要注意：這批紀錄沒有採檢日期，**不能說「目前是 X」「現在的數值為 X」「最近一次是 X」**——我們無法確認哪一筆是現在的狀態。請改寫成「紀錄中曾出現 X」「紀錄中的 X 已在目標範圍內」「紀錄中最低／最高曾到 X」。若某項指標在紀錄中完全沒有，就說明還沒有這項數據、建議回診時安排，不要留空也不要猜。

三段都適用上面的寫作原則與嚴格禁止事項。

輸出格式：只輸出一個 JSON 物件，不要加說明文字或程式碼圍籬。

{
  "narrative": "觀察摘要整段內容，段落之間用 \\\\n\\\\n 分隔",
  "short_term": "短期建議整段內容",
  "mid_term": "中期目標整段內容",
  "cited_values": [
    { "item": "項目名稱，逐字照抄來源", "value": "你在文中引用的數值，逐字照抄" }
  ],
  "found_after_all": [
    { "item": "程式說沒有、但你在紀錄中找到的核心指標", "as": "它在紀錄中實際的項目名稱" }
  ]
}\`;

/**
 * 敘述器的完整輸入。網頁與管線共用同一個組裝函式——先前兩邊各自拼字串，
 * 只要有一邊忘了加缺檢清單，那一邊的輸出就會少一段而沒有任何症狀。
 */
export function buildNarrativeInput(
  llmText: string,
  facts: PatientFacts,
  /**
   * 程式依門檻表推出的目標與追蹤間隔。
   *
   * 中期目標的數字由程式決定、模型只負責寫成病人的話——讓模型自己訂目標值
   * 會失去可追溯性，也可能跟醫師版對不上。清單為空時提示模型不要編。
   */
  goals?: { targets: Array<{ metric: string; value: string }>; followUp: string },
): string {
  const missing = missingCoreAnalytes(extractLabFindings(facts));
  return [
    labSectionOf(llmText),
    "【程式初步判定：可能完全沒有紀錄的核心指標（待你核對）】",
    missing.length ? missing.map((item) => \`- \${item}\`).join("\\n") : "（無，核心指標都有紀錄）",
    "【程式依指引推出的目標值（中期目標一律照抄，不得自訂）】",
    goals?.targets.length
      ? goals.targets.map((item) => \`- \${item.metric}：\${item.value}\`).join("\\n")
      : "（無，這位病人解不出可用的目標值——請不要在中期目標段編任何數字）",
    "【程式依指引推出的追蹤間隔】",
    goals?.followUp?.trim() ? goals.followUp.trim() : "（無）",
  ].join("\\n\\n");
}

export type LabNarrativeCheck = {
  narrative: string;
  /** 短期建議：一兩週內能開始做的事 */
  shortTerm: string;
  /** 中期目標：數字由程式給，模型只負責寫成病人的話 */
  midTerm: string;
  /**
   * 程式判定為缺檢、但敘述器在原始紀錄中找到的項目。
   *
   * 這是給我們看的訊號，不是給病人的：出現任何一筆就代表項目名稱比對有漏，
   * 而那個漏會同時影響門檻判定與模組觸發。實測就發生過 63 筆 Glu-AC 漏抓，
   * 導致報告寫「最低 68」而真正的最低是 20 mg/dL。
   */
  foundAfterAll: Array<{ item: string; as: string }>;
  /** 引用了來源中找不到的數值 */
  unverifiedValues: Array<{ item: string; value: string }>;
  /** 文中出現但沒有列進 cited_values 的數字 */
  uncitedNumbers: string[];
  /** 踩到禁止事項的句子 */
  bannedPhrases: string[];
};

/**
 * 禁止事項的偵測樣式。
 *
 * 刻意只抓「明確違規」而不抓「可能違規」——誤報會讓標記失去意義，
 * 而這個標記的用途是告訴人「這幾句不可信」，必須夠準才有人看。
 */
const BANNED = [
  { pattern: /最近一次|最新一筆|目前的?數值為|已(改善|惡化)|持續(上升|下降|惡化)|趨勢/, label: "聲稱時序或趨勢" },
  { pattern: /建議(您)?(開始|停用|停止|加|減|換|調整).{0,6}(藥|劑量|治療)|應(停用|加藥|減量)/, label: "處置建議" },
  { pattern: /(診斷為|確診為|罹患了|您(有|患有)).{0,10}(症|病變|症候群)/, label: "推測診斷" },
];

/**
 * 文中允許出現、不必列入 cited_values 的數字（分級、電話、單位常數等）。
 *
 * 1.73 是 eGFR 單位「mL/min/1.73m²」的一部分，不是病人的數值。把它當成
 * 未核實數字會在每一份有 eGFR 的報告上掛警語——誤報多了就沒有人看警語，
 * 真正的問題反而被稀釋掉。
 */
const ALLOWED_NUMBERS = new Set(["1", "2", "3", "4", "5", "15", "24", "119", "1925", "1.73"]);

/**
 * 指引門檻表裡出現過的數字。敘述提到「一般目標低於 7.0%」「飯前 80–130」時
 * 那些不是病人的檢驗值，但也不能無條件放行——它們必須真的來自門檻表，
 * 否則就是模型自己編的目標值。這和醫師版那條「印出的百分比必須在門檻表中
 * 找得到」是同一個檢查。
 */
const GUIDELINE_NUMBERS = new Set(
  GUIDELINE_RULES.flatMap((rule) =>
    [...\`\${rule.statement} \${rule.targetValue ?? ""} \${rule.patientStatement ?? ""}\`.matchAll(
      /(?<![\\d.])\\d+(?:\\.\\d+)?(?![\\d.])/g,
    )].map((match) => String(Number(match[0]))),
  ),
);

function numeric(raw: string): string | null {
  const match = String(raw).trim().match(/-?\\d+(?:\\.\\d+)?/);
  return match ? String(Number(match[0])) : null;
}

export function parseLabNarrative(raw: string, facts: PatientFacts): LabNarrativeCheck {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/\`\`\`(?:json)?\\s*([\\s\\S]*?)\`\`\`/i);
  const candidate = fenced ? fenced[1].trim() : trimmed;

  let parsed: unknown;
  try {
    parsed = JSON.parse(candidate);
  } catch {
    const first = candidate.indexOf("{");
    const last = candidate.lastIndexOf("}");
    if (first === -1 || last <= first) throw new Error("檢驗敘述器沒有回傳可解析的 JSON。");
    parsed = JSON.parse(candidate.slice(first, last + 1));
  }
  const record = (parsed ?? {}) as Record<string, unknown>;
  const narrative = String(record.narrative ?? "").trim();
  const shortTerm = String(record.short_term ?? "").trim();
  const midTerm = String(record.mid_term ?? "").trim();
  // 核實與禁止事項掃描對三段一視同仁。只驗觀察摘要的話，另外兩段等於沒人看，
  // 而短期建議正是最容易滑出「叫病人自行停藥」的一段。
  const allText = [narrative, shortTerm, midTerm].filter(Boolean).join("\\n\\n");

  const cited = (Array.isArray(record.cited_values) ? record.cited_values : [])
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
    .map((item) => ({ item: String(item.item ?? "").trim(), value: String(item.value ?? "").trim() }))
    .filter((item) => item.value);

  /*
   * 逐「項目＋數值」比對，不是只比數值。
   *
   * 先前只確認數字曾出現在病人的**任一**檢驗裡，於是模型把血糖 315 mg/dL
   * 寫成「糖化血色素 315 %」照樣通過——315 確實存在，只是屬於另一個項目。
   * 外部審查實測到這個洞，我重現了：unverified=[]、uncited=[]，完全放行。
   *
   * 現在要求兩件事同時成立：項目名稱在來源找得到，而且那個數值屬於**那個項目**。
   * 名稱比對放寬到雙向包含（模型常寫「糖化血色素（HbA1c）」而來源是「HbA1c」），
   * 但不放寬到「任一項目」——那正是這個洞的成因。
   */
  const normalise = (text: string) =>
    text
      .toLowerCase()
      .replace(/[（）()\\[\\]｜|、，,。.\\s_-]/g, "")
      .replace(/[０-９]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xfee0));

  const sourceByItem = facts.labItems.map((item) => ({
    key: normalise(item.itemName),
    values: new Set(item.rawValues.map(numeric).filter((n): n is string => n !== null)),
  }));

  const unverifiedValues = cited.filter((item) => {
    const n = numeric(item.value);
    if (n === null) return false;
    const key = normalise(item.item);
    if (!key) return true;
    const owners = sourceByItem.filter((row) => row.key === key || row.key.includes(key) || key.includes(row.key));
    // 名稱完全找不到，或找得到但那個項目沒有這個數值——兩種都不算核實
    return !owners.some((row) => row.values.has(n));
  });

  // 文中每一個數字都要能對應到 cited_values 或允許清單，否則就是沒被驗證過的數字
  const citedNumbers = new Set(cited.map((item) => numeric(item.value)).filter((n): n is string => n !== null));
  const uncitedNumbers = [
    ...new Set(
      [...allText.matchAll(/(?<![\\d.])\\d+(?:\\.\\d+)?(?![\\d.])/g)]
        .map((match) => match[0])
        .filter((raw) => {
          const n = numeric(raw);
          return n !== null && !citedNumbers.has(n) && !ALLOWED_NUMBERS.has(n) && !GUIDELINE_NUMBERS.has(n);
        }),
    ),
  ];

  const bannedPhrases = BANNED.filter((rule) => rule.pattern.test(allText)).map((rule) => rule.label);

  const foundAfterAll = (Array.isArray(record.found_after_all) ? record.found_after_all : [])
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
    .map((item) => ({ item: String(item.item ?? "").trim(), as: String(item.as ?? "").trim() }))
    .filter((item) => item.item);

  return { narrative, shortTerm, midTerm, foundAfterAll, unverifiedValues, uncitedNumbers, bannedPhrases };
}

/**
 * 檢查不通過的說明。三段共用同一份——問題是整份回應的，不是某一段的。
 */
export function narrativeProblems(check: LabNarrativeCheck): string[] {
  const problems: string[] = [];
  if (check.unverifiedValues.length) {
    problems.push(\`引用了來源中找不到的數值：\${check.unverifiedValues.map((v) => \`\${v.item} \${v.value}\`).join("、")}\`);
  }
  if (check.uncitedNumbers.length) {
    problems.push(\`文中這些數字既不在引用清單也不在指引門檻表，未經比對：\${check.uncitedNumbers.join("、")}\`);
  }
  if (check.bannedPhrases.length) {
    problems.push(\`可能踩到禁止事項：\${check.bannedPhrases.join("、")}\`);
  }
  if (check.foundAfterAll.length) {
    problems.push(
      \`程式判定為缺檢但實際存在：\${check.foundAfterAll.map((v) => \`\${v.item}（紀錄中寫作 \${v.as}）\`).join("、")}——項目名稱比對有漏，需修正\`,
    );
  }
  return problems;
}

/** 病人版渲染。檢查不通過的部分會被標示出來，但文字本身不改寫。 */
export function formatLabNarrative(check: LabNarrativeCheck): string[] {
  const lines = [check.narrative];
  const problems = narrativeProblems(check);
  if (problems.length) {
    lines.push("", \`⚠ 這一段未通過自動檢查，不可直接提供給病人：\${problems.join("；")}\`);
  }
  return lines;
}
`,je=`/**
 * 第四層：確定性輸出驗證器。
 *
 * 這裡只檢查「可以用程式 100% 判定」的事。判斷語氣、可讀性、臨床合理性
 * 仍然需要人或 LLM 稽核——但那些不應該和這些機械規則混在一起評分。
 *
 * 用途有二：
 *   1. 在 LLM 稽核之前先跑，把機械違規直接標出來。
 *   2. 作為 A/B/C 比較的評分器。它不會漂移，所以跨 arm 的分數可以直接比較。
 */

export type CheckId =
  | "no-symbol-bullets"
  | "no-markdown-emphasis"
  | "no-risk-labels"
  | "no-internal-codes"
  | "required-headings"
  | "single-separator"
  | "pr-omitted-when-r-positive"
  | "iso-report-date"
  | "numbers-supported"
  | "no-self-medication-change"
  | "evidence-sources";

export type CheckResult = {
  id: CheckId;
  label: string;
  passed: boolean;
  /** 違規的具體位置與內容，最多列 10 筆 */
  violations: string[];
  /** 這項檢查是否適用於目前的 profile */
  applicable: boolean;
};

export type ValidationReport = {
  profile: ValidationProfile;
  results: CheckResult[];
  applicableCount: number;
  passedCount: number;
  /** 通過率，0–1。分母只算適用的檢查。 */
  score: number;
};

export type ValidationProfile = "v14" | "workbench" | "modules";

/**
 * 指引與一般照護中會合法出現、但不會出現在病人申報資料裡的數值。
 * 出現在這份清單裡的數字不會被 numbers-supported 判為捏造。
 * 這份清單本身就是「應該被抽出來管理的門檻值」——目前 v14 prompt 把它們寫死在散文裡。
 */
export const GUIDELINE_TARGET_NUMBERS = new Set([
  "7", "7.0", "7.5", "8", "8.0", "8.5", // HbA1c 目標
  "70", "100", "40", "50", // LDL-C / HDL-C 目標
  "130", "140", "150", "80", "90", // 血壓目標
  "160", "180", "250", // 血糖目標與嚴重高血糖門檻
  "30", "60", "15", "45", // eGFR 分期與 UACR
  "1.73", // eGFR 單位 mL/min/1.73m²
  "65", "80", // 年齡門檻
  "119", "1925", // 緊急電話與安心專線
  "128", // 音叉震動感檢查頻率 128 Hz
  "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", // 條列編號
  "0", "12", "24", "48",
  "2022", "2024", "2026", // 指引、年鑑與報告年份
]);

const REQUIRED_V14_HEADINGS = [
  "一、觀察與提醒",
  "二、短期目標",
  "三、中期目標",
  "四、並發症預防與照護",
  "五、溫馨叮嚀",
];

/**
 * modules profile 的六個段落，順序即為報告順序。
 *
 * 對齊健保署要求的五大核心面向；就醫警訊收尾。缺任何一段或順序錯了都是
 * 組裝出問題，不是內容問題——所以這是機械檢查得出來的事。
 */
const REQUIRED_MODULE_HEADINGS = [
  "【觀察摘要：",
  // 先前漏了這一段。③ 呼叫失敗時短期建議整段消失，而檢查清單沒有它，
  // 於是驗證照樣宣稱六段完整——外部審查重現了 hasShortTerm=false 但 passed=true。
  "【短期建議：",
  "【中期目標：",
  "【併發症風險：",
  "【預防叮嚀：",
  "【什麼情況要立刻就醫】",
];

const RISK_LABEL_PATTERN = /(高風險|中風險|低風險)/g;
const RISK_LABEL_ALLOWED = /高風險族群/;
const INTERNAL_CODE_PATTERN = /\\b(?:R[1-7]|PR[1-7]|DCSI)\\b|總分|得分|[0-9０-９]\\s*分(?![鐘鍾])/g;
const SELF_MED_CHANGE_PATTERN = /自行(?:停藥|減藥|加藥|換藥|停用|調整劑量|增減劑量|增減藥量|更改劑量|更換藥品)/g;
/**
 * 「不自行停藥」「請勿自行停藥」「切勿自行減藥」都是正確衛教，只有肯定句才是違規。
 * 判定方式：看該次出現前 15 字內有沒有否定詞。
 * 已知限制：前文若因其他原因出現否定詞會漏判，屬於寧可漏報不誤報的取捨。
 */
const NEGATION_NEAR = /[不勿禁避免切別毋]/;
const NEGATION_WINDOW = 15;

function collectLineViolations(text: string, test: (line: string) => string | null): string[] {
  const violations: string[] = [];
  const lines = text.split("\\n");
  for (let index = 0; index < lines.length; index += 1) {
    const hit = test(lines[index]);
    if (hit !== null) violations.push(\`第 \${index + 1} 行：\${hit}\`);
    if (violations.length >= 10) break;
  }
  return violations;
}

function extractNumbers(text: string): string[] {
  return [...text.matchAll(/\\d+(?:\\.\\d+)?/g)].map((match) => match[0]);
}

function check(id: CheckId, label: string, applicable: boolean, violations: string[]): CheckResult {
  return { id, label, applicable, passed: applicable ? violations.length === 0 : true, violations };
}

export type ValidateArgs = {
  report: string;
  /** 生成時實際送進去的病人資料，用來做 numbers-supported */
  patientText: string;
  profile: ValidationProfile;
  /** 已發生併發症為正的項目編號，例如 [2, 4]，用來檢查對應 PR 是否已省略 */
  positiveComplications?: number[];
  /**
   * 由輸入資料合法推導出來、但不會逐字出現的數字，例如以出生日期與報告日期算出的年齡。
   * 不列進來的話 numbers-supported 會把正確的推導誤判為捏造。
   */
  derivedNumbers?: Array<string | number>;
};

/** DRAFT 橫幅是版本標記，不是臨床內容，數字檢查要排除它。 */
function stripBanner(text: string): string {
  return text
    .split("\\n")
    .filter((line) => !line.trimStart().startsWith("※ DRAFT"))
    .join("\\n");
}

export function validateReport(args: ValidateArgs): ValidationReport {
  const { patientText, profile, positiveComplications = [], derivedNumbers = [] } = args;
  const report = stripBanner(args.report);
  const isV14 = profile === "v14";
  const isModules = profile === "modules";
  const results: CheckResult[] = [];

  results.push(
    check(
      "no-symbol-bullets",
      "沒有任何一行以 - * + • ‧ 開頭",
      isV14 || isModules,
      collectLineViolations(report, (line) => {
        const trimmed = line.trimStart();
        return /^[-*+•‧]\\s/.test(trimmed) ? trimmed.slice(0, 60) : null;
      }),
    ),
  );

  results.push(
    check(
      "no-markdown-emphasis",
      "沒有 Markdown 粗體、標題符號或表格符號",
      isV14 || isModules,
      collectLineViolations(report, (line) => {
        if (/\\*\\*/.test(line)) return \`使用了 ** ：\${line.trim().slice(0, 60)}\`;
        if (/^\\s*#/.test(line)) return \`使用了 # 標題：\${line.trim().slice(0, 60)}\`;
        if (/\\|.*\\|/.test(line)) return \`疑似表格：\${line.trim().slice(0, 60)}\`;
        return null;
      }),
    ),
  );

  results.push(
    check(
      "no-risk-labels",
      "沒有把高／中／低風險當成分級標籤",
      isV14 || isModules,
      collectLineViolations(report, (line) => {
        const matches = line.match(RISK_LABEL_PATTERN);
        if (!matches) return null;
        const withoutAllowed = line.replace(new RegExp(RISK_LABEL_ALLOWED.source, "g"), "");
        return RISK_LABEL_PATTERN.test(withoutAllowed) ? line.trim().slice(0, 60) : null;
      }),
    ),
  );

  results.push(
    check(
      "no-internal-codes",
      "病人可見內容沒有 R／PR／DCSI 代碼或分數",
      isV14 || isModules,
      (() => {
        // v14 的醫師版允許代碼，只檢查分隔線之後的病人版。
        const patientSection = isV14 && report.includes("[AI_SECTION_SEPARATOR]")
          ? report.split("[AI_SECTION_SEPARATOR]").slice(1).join("\\n")
          : report;
        return collectLineViolations(patientSection, (line) => {
          const matches = line.match(INTERNAL_CODE_PATTERN);
          return matches ? \`\${matches.join("、")}｜\${line.trim().slice(0, 50)}\` : null;
        });
      })(),
    ),
  );

  results.push(
    check(
      "required-headings",
      isModules ? "六個段落逐字完整且順序正確" : "五大標題逐字完整且順序正確",
      isV14 || isModules,
      (() => {
        const headings = isModules ? REQUIRED_MODULE_HEADINGS : REQUIRED_V14_HEADINGS;
        const positions = headings.map((heading) => ({ heading, at: report.indexOf(heading) }));
        const missing = positions.filter((item) => item.at === -1).map((item) => \`缺少「\${item.heading}」\`);
        if (missing.length) return missing;
        const order = positions.map((item) => item.at);
        const sorted = [...order].sort((a, b) => a - b);
        return order.every((value, index) => value === sorted[index]) ? [] : ["段落出現順序與規定不符"];
      })(),
    ),
  );

  results.push(
    check(
      "single-separator",
      "[AI_SECTION_SEPARATOR] 恰好出現一次",
      isV14,
      (() => {
        const count = report.split("[AI_SECTION_SEPARATOR]").length - 1;
        return count === 1 ? [] : [\`出現 \${count} 次\`];
      })(),
    ),
  );

  results.push(
    check(
      "pr-omitted-when-r-positive",
      "已發生併發症的項目不出現在未來風險預測清單",
      isV14 && positiveComplications.length > 0,
      positiveComplications
        .filter((index) => new RegExp(\`PR\${index}\\\\b\`).test(report))
        .map((index) => \`R\${index} 大於 0，但報告中仍出現 PR\${index}\`),
    ),
  );

  results.push(
    check(
      "iso-report-date",
      "報告日期使用 YYYY-MM-DD",
      isV14 || isModules,
      (() => {
        const badFormats = [...report.matchAll(/\\d{4}\\s*年\\s*\\d{1,2}\\s*月\\s*\\d{1,2}\\s*日|\\d{4}\\/\\d{1,2}\\/\\d{1,2}/g)].map(
          (match) => match[0],
        );
        return badFormats.slice(0, 10).map((item) => \`非 ISO 日期格式：\${item}\`);
      })(),
    ),
  );

  results.push(
    check(
      "numbers-supported",
      "報告中的數字都能在輸入資料或指引目標值中找到",
      true,
      (() => {
        const inputNumbers = new Set(extractNumbers(patientText));
        for (const value of derivedNumbers) inputNumbers.add(String(value));
        const unsupported = new Set<string>();
        for (const value of extractNumbers(report)) {
          if (inputNumbers.has(value)) continue;
          if (GUIDELINE_TARGET_NUMBERS.has(value)) continue;
          unsupported.add(value);
        }
        return [...unsupported].slice(0, 10).map((value) => \`輸入資料中找不到的數字：\${value}\`);
      })(),
    ),
  );

  results.push(
    check(
      "no-self-medication-change",
      "沒有建議病人自行停藥、改藥或調整劑量",
      true,
      collectLineViolations(report, (line) => {
        for (const match of line.matchAll(SELF_MED_CHANGE_PATTERN)) {
          const before = line.slice(Math.max(0, (match.index ?? 0) - NEGATION_WINDOW), match.index);
          if (!NEGATION_NEAR.test(before)) return \`\${match[0]}｜\${line.trim().slice(0, 60)}\`;
        }
        return null;
      }),
    ),
  );

  results.push(
    check(
      "evidence-sources",
      "完整引用兩份來源與免責聲明",
      isV14,
      (() => {
        const missing: string[] = [];
        if (!report.includes("2022第2型糖尿病臨床照護指引")) missing.push("缺少 2022 臨床照護指引來源");
        if (!report.includes("糖尿病年鑑")) missing.push("缺少臺灣糖尿病年鑑來源");
        return missing;
      })(),
    ),
  );

  const applicable = results.filter((item) => item.applicable);
  const passed = applicable.filter((item) => item.passed);

  return {
    profile,
    results,
    applicableCount: applicable.length,
    passedCount: passed.length,
    score: applicable.length ? passed.length / applicable.length : 1,
  };
}

export function summarizeValidation(report: ValidationReport): string {
  const lines = [\`確定性驗證：\${report.passedCount}/\${report.applicableCount} 項通過（\${Math.round(report.score * 100)}%）\`];
  for (const item of report.results) {
    if (!item.applicable) continue;
    lines.push(\`\${item.passed ? "✓" : "✗"} \${item.label}\`);
    for (const violation of item.violations) lines.push(\`    \${violation}\`);
  }
  return lines.join("\\n");
}
`;function Me(e,t){let n=t,r=t-1;if(r>=0&&e[r].trim().endsWith(`*/`)){for(;r>=0&&!e[r].trim().startsWith(`/*`);)--r;r>=0&&(n=r)}else for(;r>=0&&e[r].trim().startsWith(`//`);)n=r,--r;return n}function Ne(e,t){let n=e.split(`
`),r=RegExp(`^\\s*(?:export\\s+)?(?:async\\s+)?(?:function|const|type|class)\\s+${t}\\b`),i=n.findIndex(e=>r.test(e));if(i===-1)return null;let a=Me(n,i),o=0,s=!1;for(let e=i;e<n.length;e+=1){for(let t of n[e])t===`{`||t===`(`||t===`[`?(o+=1,s=!0):(t===`}`||t===`)`||t===`]`)&&--o;if(!s&&n[e].trimEnd().endsWith(`;`)||s&&o<=0)return n.slice(a,e+1).join(`
`)}return null}function U(e,t,n){return t.map(t=>Ne(e,t)??`// ⚠ 在 ${n} 中找不到 ${t}，可能已改名`).join(`

`)}function Pe(e){let t=[];return e.rawInput.trim()?e.parsedJson||t.push({code:`not-json`,message:`這份內容不是可解析的 JSON。`,howToFix:`這條流程需要結構化欄位（R／PR／CKD／檢驗紀錄）才能判定主題與門檻，純文字無法使用。請改上傳原始 JSON。`,hard:!0}):t.push({code:`no-input`,message:`還沒有病人資料。`,howToFix:`上傳健保申報 JSON、貼上 JSON 內容，或按「載入去識別示範」。`,hard:!0}),e.model.trim()||t.push({code:`no-model`,message:`沒有選擇模型。`,howToFix:`在下方選一個模型，或填入自訂模型 ID。`,hard:!0}),e.requiresClientKey&&!e.apiKey.trim()&&t.push({code:`no-key`,message:`這個版本需要在頁面輸入 Gemini API 金鑰。`,howToFix:`在下方貼上金鑰。金鑰只留在這一頁的記憶體，重新整理即清除。`,hard:!0}),e.totalTokens>e.tokenLimit&&t.push({code:`over-limit`,message:`輸入約 ${e.totalTokens.toLocaleString(`zh-TW`)} tokens，超過模型上限 ${e.tokenLimit.toLocaleString(`zh-TW`)}。`,howToFix:`本工具不會自動截斷病人資料。請改用可接受更長輸入的模型，或減少送入的紀錄。`,hard:!0}),t}function Fe(e){return e.some(e=>e.hard)}function Ie(e,t,n){let r=n??{tokens:De(t),method:`estimate`};return{label:e,chars:P(t),tokens:r.tokens,method:r.method}}function Le(e){let t=[{label:`① 資料稽核：system prompt`,text:e.selectorPrompt},{label:`① 資料稽核：病人事實摘要`,text:e.factsText},{label:`② 檢驗判讀：system prompt`,text:e.labReviewPrompt},{label:`② 檢驗判讀：檢驗紀錄`,text:e.labText},{label:`③ 檢驗敘述：system prompt`,text:e.narrativePrompt},{label:`③ 檢驗敘述：檢驗紀錄與缺檢清單`,text:e.narrativeText}],n=t.map(e=>Ie(e.label,e.text));return{text:t.map(e=>e.text).join(`

`),systemPrompt:e.selectorPrompt,parts:n,totalChars:n.reduce((e,t)=>e+t.chars,0),totalTokens:n.reduce((e,t)=>e+t.tokens,0)}}var Re=[`REPORT_DATE`,`BIRTHDAY`,`INDX_DATE`,`SEX`,`P4P`,`HT`,`HL`,`CKD`,`T`,`DCSI`,`AGEGP`,`GRADE`],ze={REPORT_DATE:`報告日期`,BIRTHDAY:`出生日期`,INDX_DATE:`糖尿病指標日期`,SEX:`性別代碼`,P4P:`是否參加糖尿病P4P`,HT:`高血壓`,HL:`高血脂`,CKD:`慢性腎臟病`,T:`糖尿病病程年數`,DCSI:`DCSI總分`,AGEGP:`年齡分組`,GRADE:`整體分級`},Be={medication:`用藥紀錄`,labData:`檢驗資料`,chinesemed:`中藥用藥`,imaging:`影像資料`,allergy:`過敏資料`,surgery:`手術資料`,discharge:`出院資料`,medDays:`用藥天數資料`,patientSummary:`病人摘要`,cancerScreening:`癌症篩檢`,adultHealthCheck:`成人健檢`},Ve=new Set([`drug_code`,`drug_ing_code`,`func_seq_no`,`fee_ym`,`drug_multi_mark`,`drug_std_qty`,`assay_method`]);function W(e){return!!e&&typeof e==`object`&&!Array.isArray(e)}function G(e){return e==null||e===``||e===`null`?`未提供`:typeof e==`object`?JSON.stringify(e):String(e).replaceAll(`\r`,` `).replaceAll(`
`,` `).trim()||`未提供`}function He(e){return Array.isArray(e)?e.map(He):W(e)?Object.fromEntries(Object.keys(e).sort().map(t=>[t,He(e[t])])):e}function Ue(e){let t=new Map;for(let n of e){let e=JSON.stringify(He(n)),r=t.get(e);r?r.count+=1:t.set(e,{record:n,count:1})}return[...t.values()]}function We(e,t){let n=Re.indexOf(e),r=Re.indexOf(t);if(n!==-1||r!==-1)return n===-1?1:r===-1?-1:n-r;let i=e.match(/^(R|PR)(\d+)$/),a=t.match(/^(R|PR)(\d+)$/);return i&&a?i[1]===a[1]?Number(i[2])-Number(a[2]):i[1]===`R`?-1:1:i?-1:a?1:e.localeCompare(t)}function Ge(e,t=0){let n=`  `.repeat(t);if(Array.isArray(e))return e.length?e.flatMap((e,r)=>W(e)||Array.isArray(e)?[`${n}- 第 ${r+1} 筆`,...Ge(e,t+1)]:[`${n}- ${G(e)}`]):[`${n}（空陣列）`];if(W(e)){let r=Object.entries(e);return r.length?r.flatMap(([e,r])=>W(r)||Array.isArray(r)?[`${n}${e}：`,...Ge(r,t+1)]:[`${n}${e}：${G(r)}`]):[`${n}（空物件）`]}return[`${n}${G(e)}`]}function Ke(e,t){let n=e[t];return W(n)&&Array.isArray(n.rObject)?n.rObject:[]}function qe(e){return W(e)?Object.entries(e).filter(([,e])=>e!=null&&e!==``&&e!==`null`).map(([e,t])=>`${e}:${G(t)}`).join(`｜`):G(e)}function Je(e,t={}){let n=t.skipIrrelevantLabs??!0;if(!W(e))return[`【輸入資料】`,...Ge(e),``,`【資料使用限制】`,`以上僅重新排版，沒有推定缺少的診斷、日期、用藥狀態或治療資訊。`].join(`
`);if(![`downloadType`,`userInfo`,`userInput`,`rawSources`].some(t=>t in e))return[`【來源JSON欄位】`,...Ge(e),``,`【資料使用限制】`,`以上保留來源欄位並重新排版；空值或未出現欄位不得自行解讀為0或正常。`].join(`
`);let r=[`【檔案與基本資料】`,`資料匯出類型：${G(e.downloadType)}`],i=W(e.userInfo)?e.userInfo:{},a=W(e.userInput)?e.userInput:{},o=W(e.rawSources)?e.rawSources:{};for(let[e,t]of Object.entries(i))r.push(`${e}：${G(t)}`);r.push(``,`【來源模型欄位】`,`以下保留來源原值；未提供不等同於0。`);let s=Object.keys(a).sort(We);s.length||r.push(`未提供來源模型欄位。`);for(let e of s){let t=ze[e]?`（${ze[e]}）`:``;r.push(`${e}${t}：${G(a[e])}`)}r.push(``,`【DCSI與風險欄位說明】`),r.push(`僅保留來源DCSI、R與PR原始欄位；整理階段不重新解釋分數。來源未出現的欄位不得自行補值，也不得直接視為0。`),r.push(``,`【資料來源概況】`);let c=Object.entries(o);c.length||r.push(`未提供rawSources資料來源。`);for(let[e,t]of c){let n=W(t)&&Array.isArray(t.rObject)?t.rObject:[];r.push(`${Be[e]??e}（${e}）：${n.length}筆${n.length?``:`，來源為空陣列`}`)}let l=Ke(o,`medication`),u=Ue(l),d=new Map;for(let e of u){let t=W(e.record)?e.record:{},n=`${G(t.drug_date).replaceAll(`/`,`-`)}｜${`ICD ${G(t.icd_code)}｜${G(t.icd_cname)}`}`,r=qe(Object.fromEntries(Object.entries(t).filter(([e])=>![`drug_date`,`icd_code`,`icd_cname`,`drug_ename`].includes(e)&&!Ve.has(e)))),i=d.get(n)??[];i.push({text:r||`原紀錄沒有其他欄位`,count:e.count}),d.set(n,i)}r.push(``,`【用藥紀錄】`),r.push(`來源共${l.length}筆；完全相同紀錄合併後${u.length}筆。重複次數以×N保留；不同欄位不合併。`),l.length||r.push(`未提供用藥紀錄。`);for(let e of[...d.keys()].sort().reverse()){r.push(e);for(let t of d.get(e)??[])r.push(`- ${t.text}${t.count>1?`｜×${t.count}`:``}`)}let f=/^(13007C|13023C|13006C|11002C)$/,p=[/^(p?H|pH值)$/i,/^(PO2|pO2|PCO2|pCO2|HCO3|TCO2|O2SAT|BE|BEecf|BEb|SBC|ctO2|FIO2|A-?aDO2)/i,/(lymphocyte|monocyte|basophil|eosinophil|neutrophil|^ANC$|^Meta$|^Blast$|^Band|myelocyte|atypical|^Promye)/i,/(^hs)?CRP|procalcitonin|^ESR$|紅血球沉降/i,/^(PT|aPTT|APTT|INR)$|凝血|fibrinogen|D-?dimer/i];function m(e){if(f.test(String(e.order_code??``).trim()))return!0;let t=String(e.assay_item_name??``).trim();return p.some(e=>e.test(t))}let h=Ke(o,`labData`),g=Ue(h),_=new Map,v=0;for(let e of g){let t=W(e.record)?e.record:{};if(n&&m(t)){v+=e.count;continue}let r=[G(t.fee_ym),G(t.order_code),G(t.order_name),`檢體或模式:${G(t.inspect_mode)}`].join(`｜`),i=`${G(t.assay_item_name)}=${G(t.assay_value)}`;G(t.unit_data)!==`未提供`&&(i+=` ${G(t.unit_data)}`),i+=`｜參考:${G(t.consult_value)}`;let a=Object.entries(t).filter(([e,t])=>![`fee_ym`,`order_code`,`order_name`,`assay_method`,`inspect_mode`,`assay_item_name`,`assay_value`,`unit_data`,`consult_value`].includes(e)&&!Ve.has(e)&&t!=null&&t!==``).map(([e,t])=>`${e}:${G(t)}`);a.length&&(i+=`｜其他欄位:${a.join(`、`)}`);let o=_.get(r)??[];o.push({text:i,count:e.count}),_.set(r,o)}r.push(``,`【檢驗與檢查紀錄】`),r.push(`來源共${h.length}筆；完全相同紀錄合併後${g.length}筆。`+(v?`其中${v}筆與糖尿病長期照護無關（微生物培養、藥敏、輸血配合、血液氣體、白血球分類、發炎與凝血指標），未列於下方。`:``)+`若來源只有費用年月而沒有採檢日時，不得推定同月份內的先後順序。`),h.length||r.push(`未提供檢驗與檢查紀錄。`);for(let e of[..._.keys()].sort().reverse()){r.push(e);for(let t of _.get(e)??[])r.push(`- ${t.text}${t.count>1?`｜×${t.count}`:``}`)}r.push(``,`【其他來源的非空紀錄】`);let y=0;for(let[e]of c.filter(([e])=>![`medication`,`labData`].includes(e))){let t=Ke(o,e);if(!t.length)continue;y+=t.length;let n=Ue(t);r.push(`${Be[e]??e}（${e}）：來源${t.length}筆，完全相同紀錄合併後${n.length}筆。`),n.forEach((e,t)=>{r.push(`- ${t+1}. ${qe(e.record)}${e.count>1?`｜×${e.count}`:``}`)})}y||r.push(`其餘來源目前沒有可列出的紀錄。`);let b=Object.keys(e).filter(e=>![`downloadType`,`userInfo`,`userInput`,`rawSources`].includes(e));if(b.length){r.push(``,`【其他根層欄位】`);for(let t of b)r.push(`${t}：${G(e[t])}`)}return r.push(``,`【資料使用限制】`),r.push(`以上為來源JSON重新排版；除合併完全相同紀錄外，未刪除不同結果，也未判定哪一筆較可信。重複筆數均以×N保留。`),r.push(`不同檢驗數值可能代表真實病程變化，也可能涉及資料品質；若有疑義，應由醫療人員結合實際採檢時間與臨床狀況確認。`),r.push(`來源未提供的日期、糖尿病類型、診斷、檢驗、用藥狀態或治療資訊不得自行補寫；歷史申報用藥不得直接描述為目前仍在使用。`),r.join(`
`)}var Ye=300;function Xe(e,t=Ye){let n=e.replace(/\s+/g,` `).trim();return n.length<=t?n:`${n.slice(0,t)}…（原始回應共 ${n.length} 字，此處僅顯示前 ${t} 字）`}function Ze(e,t){let n=t.toLowerCase();return e===429||e>=500?!0:e===400&&(n.includes(`api key not valid`)||n.includes(`api_key_invalid`))?!1:!!(e===400&&(n.includes(`invalid argument`)||n.includes(`invalid_request`)))}function Qe(e,t){let n=t.toLowerCase();return e===400&&(n.includes(`api key not valid`)||n.includes(`api_key_invalid`))?{title:`Gemini 不接受這把 API 金鑰（HTTP 400）`,advice:`請確認貼上的是完整、未過期的金鑰，且該金鑰已啟用 Generative Language API。重新貼一次時注意不要含到前後空白。`}:e===400?{title:`Gemini 認為這次請求的內容或參數有問題（HTTP 400）`,advice:`常見原因是模型 ID 不支援目前的請求格式，或輸入內容含有無法處理的欄位。請對照下方原始錯誤，先試著改用預設模型。`}:e===401||e===403?{title:`這把金鑰沒有呼叫此模型的權限（HTTP `+e+`）`,advice:`請確認金鑰所屬專案已啟用 Generative Language API、未被限制來源網域，且帳單設定允許使用這個模型。`}:e===404?{title:`找不到這個模型 ID（HTTP 404）`,advice:`請確認模型名稱拼寫正確且你的金鑰有權存取。可先切回預設的 gemini-3.6-flash 確認流程本身正常。`}:e===413?{title:`請求內容過大，被拒絕（HTTP 413）`,advice:`檢驗紀錄很多的病人，②③ 兩次呼叫的輸入會很大。本工具不會自動截斷病人資料，需要縮減請由你決定，或改用可接受更長輸入的模型。`}:e===429?{title:`超過配額或速率上限（HTTP 429）`,advice:`每產出一份報告會送出三次呼叫，免費層級的額度用得很快。下方原文會寫明是哪一項配額、上限多少、建議多久後重試。請等額度恢復、改用其他模型，或換一把有額度的金鑰。`}:e===408||e===504||e===524||e===522?{title:`請求逾時（HTTP ${e}）`,advice:`檢驗紀錄多的病人，單次回應可能需要數分鐘，中間的代理層可能先行斷線。可延長逾時上限，或改用回應較快的模型。`}:e===499?{title:`連線在回應完成前被中斷（HTTP 499）`,advice:`多半是瀏覽器或中間代理層提前關閉連線。若發生在輸入很大的病人身上，請比照逾時處理。`}:e>=500?{title:`Gemini 端暫時性錯誤（HTTP ${e}）`,advice:`這不是你的輸入造成的。請稍候重試；若持續發生，改用另一個模型或稍後再跑。`}:{title:`Gemini 回傳 HTTP ${e}`,advice:`請參考下方原始錯誤內容判斷原因。`}}function $e(e){let t=e.trim();return t&&t.toLowerCase()!==`unknown`?t:``}function K(e){let{status:t=null,apiMessage:n=``,rawBody:r=``,cause:i,timedOut:a=!1}=e,o=$e(e.statusText??``);if(i instanceof Error&&i.name===`AbortError`&&!a)return{title:`已依你的要求停止這次請求`,advice:`沒有送出任何後續請求；你可以調整設定後重新執行。`,raw:``,status:null,aborted:!0,timedOut:!1,retryable:!1};if(a||i instanceof Error&&i.name===`TimeoutError`)return{title:`等待 Gemini 回應超過設定的時間上限`,advice:`檢驗紀錄多的病人回應時間會明顯拉長。可以延長逾時上限，或改用較快的模型。請求已中止，沒有部分結果。`,raw:i instanceof Error?i.message:``,status:null,aborted:!1,timedOut:!0,retryable:!1};if(i instanceof TypeError)return{title:`瀏覽器無法送出這次請求（網路層失敗）`,advice:`常見原因：網路中斷、瀏覽器擴充功能或企業代理封鎖了對 Gemini 的請求、或 CORS 被擋。請開瀏覽器主控台看是否有被封鎖的紀錄，並試著關閉擴充功能後重試。`,raw:i.message,status:null,aborted:!1,timedOut:!1,retryable:!1};if(t===null)return{title:`請求失敗`,advice:`請參考下方原始錯誤內容。`,raw:i instanceof Error?i.message:String(i??``),status:null,aborted:!1,timedOut:!1,retryable:!1};if(!n&&r){let e=/^\s*<(?:!doctype|html)/i.test(r),n=Qe(t,r);return{title:e?`回應不是 Gemini 的 JSON，而是一頁 HTML（HTTP ${t}${o?` ${o}`:``}）`:n.title,advice:e?`這代表請求沒有走到 Gemini，或在中途被代理層攔下並改回錯誤頁。${n.advice}`:n.advice,raw:Xe(r),status:t,aborted:!1,timedOut:!1,retryable:Ze(t,r)}}let s=Qe(t,n);return{title:s.title,advice:s.advice,raw:n?Xe(n):``,status:t,aborted:!1,timedOut:!1,retryable:Ze(t,n)}}var et=`https://generativelanguage.googleapis.com/v1/interactions`;function q(e){return!!e&&typeof e==`object`&&!Array.isArray(e)}async function tt(e){let t=await e.text(),n=null;try{let e=JSON.parse(t);q(e)&&(n=e)}catch{n=null}return{ok:e.ok,status:e.status,statusText:e.statusText,json:n,rawBody:t}}function nt(e){return typeof e.output_text==`string`?e.output_text:typeof e.outputText==`string`?e.outputText:[...Array.isArray(e.steps)?e.steps:[]].reverse().flatMap(e=>!q(e)||e.type!==`model_output`||!Array.isArray(e.content)?[]:e.content).filter(e=>q(e)&&e.type===`text`&&typeof e.text==`string`).map(e=>String(e.text)).join(`
`).trim()||(Array.isArray(e.outputs)?e.outputs:[]).flatMap(e=>q(e)&&Array.isArray(e.content)?e.content:[]).filter(e=>q(e)&&typeof e.text==`string`).map(e=>String(e.text)).join(`
`).trim()||(Array.isArray(e.candidates)?e.candidates:[]).flatMap(e=>{if(!q(e))return[];let t=e.content;return q(t)&&Array.isArray(t.parts)?t.parts:[]}).filter(e=>q(e)&&typeof e.text==`string`).map(e=>String(e.text)).join(`
`).trim()}function rt(e){if(!e)return``;let t=e.error;return q(t)&&typeof t.message==`string`?t.message:typeof e.error==`string`?e.error:``}function it(e,t){let n=new AbortController,r=setTimeout(()=>n.abort(new DOMException(`timeout`,`TimeoutError`)),t);return{signal:AbortSignal.any([e,n.signal]),timedOut:()=>n.signal.aborted,cleanup:()=>clearTimeout(r)}}var J=class extends Error{constructor(e){super(e.title),this.name=`GeminiRequestError`,this.failure=e}},at=4;async function ot(e){let t;for(let n=1;n<=at;n+=1)try{return await st(e)}catch(r){if(t=r,!(r instanceof J&&r.failure.retryable&&n<at))throw r;await new Promise((t,i)=>{let a=setTimeout(t,1500*2**(n-1));e.signal.addEventListener(`abort`,()=>{clearTimeout(a),i(r)},{once:!0})})}throw t}async function st(e){let{apiKey:t,model:n,systemPrompt:r,input:i,signal:a,direct:o,simulate:s}=e,c=it(a,e.timeoutMs??9e5),l=Date.now();try{if(o&&!t.trim())throw new J(K({status:null,apiMessage:`這個版本需要在頁面輸入 Gemini API 金鑰。`}));let e=await tt(o?await fetch(et,{method:`POST`,signal:c.signal,headers:{"Content-Type":`application/json`,"x-goog-api-key":t.trim()},body:JSON.stringify({model:n,input:i,system_instruction:r,store:!1})}):await fetch(`/api/gemini`,{method:`POST`,signal:c.signal,headers:{"Content-Type":`application/json`},body:JSON.stringify({apiKey:t,model:n,systemPrompt:r,input:i})}));if(!e.ok)throw new J(K({status:e.status,statusText:e.statusText,apiMessage:rt(e.json),rawBody:e.json?``:e.rawBody}));if(!e.json)throw new J(K({status:e.status,statusText:e.statusText,rawBody:e.rawBody}));let a=o?nt(e.json):String(e.json.text??``);if(!a.trim())throw new J(K({status:e.status,apiMessage:rt(e.json)||`Gemini 已回應，但回應中找不到文字輸出。`,rawBody:e.json?``:e.rawBody}));return{text:a,usage:q(e.json.usage)?e.json.usage:q(e.json.usage_metadata)?e.json.usage_metadata:null,elapsedMs:Date.now()-l}}catch(e){throw e instanceof J?e:new J(K({cause:e,timedOut:c.timedOut()}))}finally{c.cleanup()}}var ct={eGFR:`腎絲球過濾率（eGFR）`,UACR:`尿液白蛋白／肌酸酐比值（UACR）`,HbA1c:`糖化血色素（HbA1c）`,"fasting-glucose":`飯前血糖`,"postprandial-glucose":`餐後血糖`,"LDL-C":`低密度脂蛋白膽固醇（LDL-C）`,"HDL-C":`高密度脂蛋白膽固醇（HDL-C）`,triglyceride:`三酸甘油酯`,creatinine:`血清肌酸酐`,potassium:`血鉀`,sodium:`血鈉`,haemoglobin:`血色素（Hb）`,"glucose-unspecified":`血糖（未標示採檢時機）`},lt={eGFR:`eGFR`,UACR:`UACR`,HbA1c:`HbA1c`,"fasting-glucose":`Glucose AC`,"postprandial-glucose":`Glucose PC`,"LDL-C":`LDL-C`,"HDL-C":`HDL-C`,triglyceride:`TG`,creatinine:`Cr`,potassium:`K`,sodium:`Na`,haemoglobin:`Hb`,"glucose-unspecified":`Glucose`},ut=[{analyte:`eGFR`,name:/^eGFR(\s*\((MDRD|CKD-EPI)\))?$/i},{analyte:`UACR`,name:/Albumin\s*\/\s*Creatinine|\bU?ACR\b|白蛋白.{0,6}肌酸酐.{0,4}比/i,unit:/mg\s*\/\s*g(Cr)?/i},{analyte:`HbA1c`,name:/^(HbA1c|Hb\s*A1c)/i,unit:/%/},{analyte:`fasting-glucose`,name:/(Glu(cose)?[-_\s]*AC|Glucose\(AC\)|Sugar[-_\s]*AC|空腹|飯前)/i,unit:/mg\s*\/?\s*d[lL]/i,excludeOrderCodes:/^(06012C|06013C)$/},{analyte:`postprandial-glucose`,name:/(Glu(cose)?[-_\s]*PC|Sugar[-_\s]*PC|餐後|飯後)/i,unit:/mg\s*\/?\s*d[lL]/i,excludeOrderCodes:/^(06012C|06013C)$/},{analyte:`glucose-unspecified`,name:/(glucose|sugar|血糖|葡萄糖)/i,excludeName:/estimated\s+average\s+glucose|\beAG\b/i,unit:/mg\s*\/?\s*d[lL]/i,excludeOrderCodes:/^(06012C|06013C)$/,includeOrderCodes:/^(09005C|09140C)$/},{analyte:`LDL-C`,name:/LDL[-\s]?(cholesterol|Cho)/i,unit:/mg\s*\/?\s*d[lL]/i},{analyte:`HDL-C`,name:/HDL[-\s]?(cholesterol|Cho)/i,unit:/mg\s*\/?\s*d[lL]/i},{analyte:`triglyceride`,name:/Triglyceride/i,unit:/mg\s*\/?\s*d[lL]/i},{analyte:`potassium`,name:/^(K|Potassium|血鉀)$/i,unit:/mmol\s*\/?\s*L/i},{analyte:`sodium`,name:/^(Na|Sodium|血鈉)$/i,unit:/mmol\s*\/?\s*L/i},{analyte:`haemoglobin`,name:/^(H[Bb]|H[ae]?moglobin|H[ae]?moglobin\s*血色素|血色素)$/i,excludeName:/A1c|A1C|糖化/i,unit:/g\s*\/?\s*d[lL]/i},{analyte:`creatinine`,name:/(Creatinine|\bCREA?\b|肌酸酐)/i,excludeName:/eGFR|Dipstick|Albumin\s*\/\s*Creatinine|screening/i,includeOrderCodes:/^09015C$/,excludeOrderCodes:/^(06012C|06013C|13007C)$/,unit:/mg\s*\/?\s*d[lL]/i}];function dt(e){let t=e.trim(),n=t.match(/^([≧≥>＞<＜≦≤]?)\s*(\d+(?:\.\d+)?)/);if(!n)return null;let r=Number(n[2]);if(!Number.isFinite(r))return null;let i=n[1];return{raw:t,value:r,qualifier:i===`≧`||i===`≥`?`>=`:i===`>`||i===`＞`?`>`:i===`≦`||i===`≤`?`<=`:i===`<`||i===`＜`?`<`:`=`}}function ft(e){for(let t of ut)if(!(!(t.includeOrderCodes&&e.orderCodes.some(e=>t.includeOrderCodes.test(e)))&&!t.name.test(e.itemName))&&!t.excludeName?.test(e.itemName)&&!(t.excludeOrderCodes&&e.orderCodes.some(e=>t.excludeOrderCodes.test(e)))&&!(t.unit&&!(e.unit&&t.unit.test(e.unit))))return t.analyte;return null}function pt(e){let t=e.filter(e=>e.analyte===`fasting-glucose`||e.analyte===`postprandial-glucose`||e.analyte===`glucose-unspecified`).map(e=>e.min);return t.length?Math.min(...t):null}function mt(e,t){for(let n of ut)if(n.name.test(e)&&!n.excludeName?.test(e)&&!(n.unit&&t&&!n.unit.test(t)))return n.analyte;return null}var ht=[[`HbA1c`,`糖化血色素（HbA1c）`],[`eGFR`,`腎絲球過濾率（eGFR）`],[`UACR`,`尿液白蛋白／肌酸酐比值（UACR）`],[`creatinine`,`血清肌酸酐`],[`LDL-C`,`低密度脂蛋白膽固醇`],[`HDL-C`,`高密度脂蛋白膽固醇`],[`triglyceride`,`三酸甘油酯`]];function gt(e){let t=new Set(e.map(e=>e.analyte));return ht.filter(([e])=>!t.has(e)).map(([,e])=>e)}function _t(e){let t=new Map;for(let n of e.labItems){let r=ft(n);if(!r)continue;let i=n.rawValues.map(dt).filter(e=>e!==null);if(!i.length)continue;let a=t.get(r),o=a?[...a.values,...i]:i;t.set(r,{analyte:r,label:ct[r],unit:a?.unit??n.unit,values:o,min:Math.min(...o.map(e=>e.value)),max:Math.max(...o.map(e=>e.value)),feeMonths:[...new Set([...a?.feeMonths??[],...n.feeMonths])].sort(),hasDrawDates:e.labHasDrawDates})}return[...t.values()]}function vt(e){if(!e)return``;let t=e.trim();return!t||/^(無|未提供|N\/A|null)$/i.test(t)?``:` ${t.replace(/m\s*[︿^]\s*2|(?<=\d\.\d{2})m2\b/gi,`m²`)}`}function yt(e){let t=[...new Set(e.values.map(e=>e.raw))],n=[...new Set(e.values.filter(e=>e.qualifier!==`=`).map(e=>e.raw))];if(t.length<=3)return t.join(`、`);let r=`${e.min}–${e.max}`;return n.length?`${r}（含 ${n.slice(0,3).join(`、`)}）`:r}function bt(e){let t=e.feeMonths.length?`費用年月 ${e.feeMonths.join(`、`)}`:`來源未提供年月`,n=new Set(e.values.map(e=>e.raw)).size>3?`多次紀錄，`:``;return`${e.label}：${n}${yt(e)}${vt(e.unit)}（${t}）`}function xt(e){let t=e.feeMonths.length?`費用年月 ${e.feeMonths.join(`、`)}`:`來源未提供年月`,n=new Set(e.values.map(e=>e.raw)).size,r=e.analyte===`glucose-unspecified`?`未標示採檢時機，`:``;return`${lt[e.analyte]}：${yt(e)}${vt(e.unit)}（${r}共 ${e.values.length} 筆／${n} 種結果，${t}）`}var St=`（一般臨床門檻，非本指引條列）`;function Ct(e){let t=D.get(e);return t?{statement:t.statement,citation:O(t)}:null}function wt(e,t){let n=[],r=t=>e.find(e=>e.analyte===t),i=e=>e.min===e.max?``:`（範圍 ${e.min}–${e.max}）`,a=(e,t,n)=>[...new Set(e.values.filter(e=>e.value>=t&&e.value<n).map(e=>e.raw))].join(`、`),o=e=>e.min===e.max?``:`，範圍 ${e.min}–${e.max}`,s=r(`eGFR`),c=r(`UACR`),l=s&&s.min<60,u=c&&c.values.some(e=>e.value>300||e.value===300&&e.qualifier===`>=`);if(l||u){let e=[];l&&e.push(`eGFR 曾出現低於 60 的數值（${a(s,0,60)}）`),u&&e.push(`UACR 曾出現達到或超過 300 mg/g 的結果（${[...new Set(c.values.map(e=>e.raw))].join(`、`)}）`);let t=Ct(`kidney-intensive-followup`);n.push({code:`kidney-intensive-followup`,analyte:`eGFR`,ruleId:`kidney-intensive-followup`,severity:`attention`,clinicianMessage:`${e.join(`；`)}。依指引${t?.statement??``}`,patientMessage:`您的資料中曾出現腎功能或尿蛋白的異常結果。指引建議這種情況至少每半年追蹤一次，請與醫療團隊確認您目前需要的追蹤頻率。（資料只有費用年月，無法確認這些結果的先後順序或是否為最新。）`,citation:t?.citation??null})}let d=!!(l||u||t.comorbidityFlags.ckd.known&&t.comorbidityFlags.ckd.value),f=r(`haemoglobin`),p=r(`potassium`),m=r(`sodium`),h=[f&&f.max<11?`血色素持續偏低（最高 ${f.max} g/dL）`:``,p&&(p.min<3||p.max>5.5)?`血鉀異常`:``,m&&(m.min<130||m.max>150)?`血鈉異常`:``].filter(Boolean),g=s&&s.min<30?[`eGFR 曾出現低於 30 的數值（最低 ${s.min}）`,...h]:d&&h.length?[`已有腎臟疾病證據`,...h]:[];if(g.length){let e=Ct(`referral-nephrology`);n.push({code:`referral-nephrology`,analyte:`eGFR`,ruleId:`referral-nephrology`,severity:`attention`,clinicianMessage:`${g.join(`、`)}。${e?.statement??``}`,patientMessage:null,citation:e?.citation??null})}let _=/metformin|二甲雙胍|雙胍/i,v=t.medicationIngredients.some(e=>_.test(e))||t.medicationClasses.some(e=>_.test(e.atcClass));if(s&&v){if(s.min<30){let e=Ct(`metformin-egfr-30`);n.push({code:`metformin-contraindicated`,analyte:`eGFR`,ruleId:`metformin-egfr-30`,severity:`urgent`,clinicianMessage:`eGFR 曾出現低於 30 的數值（最低 ${s.min}）。${e?.statement??``}`,patientMessage:null,citation:e?.citation??null})}else if(s.min<45){let e=Ct(`metformin-egfr-30-45`);n.push({code:`metformin-reduce`,analyte:`eGFR`,ruleId:`metformin-egfr-30-45`,severity:`attention`,clinicianMessage:`eGFR 曾出現介於 30–45 的數值（${a(s,30,45)}）。${e?.statement??``}`,patientMessage:null,citation:e?.citation??null})}}let y=r(`potassium`);if(y&&(y.min<3.5||y.max>5.5)){let e=y.min<3.5,t=e?`最低 ${y.min}`:`最高 ${y.max}`;n.push({code:`potassium-abnormal`,analyte:`potassium`,ruleId:null,severity:y.min<3||y.max>6?`urgent`:`attention`,clinicianMessage:`K 曾出現${e?`偏低`:`偏高`}數值（${t}${o(y)} mmol/L）。${St}`,patientMessage:`您的資料中曾出現${e?`偏低`:`偏高`}的血鉀數值（${t} mmol/L）。血鉀太${e?`低`:`高`}可能影響心跳與肌肉力量${e?`，利尿劑與腹瀉嘔吐都可能造成`:`，腎功能下降時較容易發生`}。這些紀錄沒有檢查日期，請在回診時主動提出。`,citation:null})}let b=r(`sodium`);if(b&&(b.min<130||b.max>150)){let e=b.min<130?`最低 ${b.min}`:`最高 ${b.max}`;n.push({code:`sodium-abnormal`,analyte:`sodium`,ruleId:null,severity:`urgent`,clinicianMessage:`Na 曾出現異常值（${e}${o(b)} mmol/L）。${St}`,patientMessage:`您的資料中曾出現異常的血鈉數值。這些紀錄沒有檢查日期，請在回診時主動提出，由醫療團隊確認目前狀況。`,citation:null})}let x=r(`eGFR`),S=t.comorbidityFlags.ckd.known&&t.comorbidityFlags.ckd.value===!0?!0:!!(x&&x.min<60),C=r(`haemoglobin`);C&&C.min<11&&n.push({code:`anaemia`,analyte:`haemoglobin`,ruleId:null,severity:C.min<8?`urgent`:`attention`,clinicianMessage:`Hb 曾出現 ${C.min} g/dL${i(C)}${S?`，合併腎功能不全，需考慮腎性貧血`:``}。${St}`,patientMessage:`您的資料中曾出現偏低的血色素（${C.min} g/dL），也就是貧血。${S?`腎功能下降的人比較容易發生貧血。`:``}貧血可能讓您容易疲倦、喘或頭暈，也會讓糖化血色素這個指標看起來比實際情況好。請在回診時主動提出。`,citation:null});let w=!!(C&&C.max<11),T=r(`HbA1c`);T||n.push({code:`hba1c-missing`,analyte:`HbA1c`,ruleId:`interval-hba1c`,severity:`attention`,clinicianMessage:`資料中沒有糖化血色素紀錄。`,patientMessage:`您的資料中沒有糖化血色素（HbA1c）的紀錄。這是評估一段期間血糖控制的指標，回診時可以確認是否需要安排。`,citation:Ct(`interval-hba1c`)?.citation??null}),T&&(S||w)&&n.push({code:`hba1c-unreliable`,analyte:`HbA1c`,ruleId:`hba1c-unreliable`,severity:`attention`,clinicianMessage:`HbA1c ${T.min===T.max?T.min:`${T.min}–${T.max}`} % 在${S?`腎功能不全`:``}${S&&w?`合併`:``}${w?`貧血`:``}的情況下可能低估實際血糖，建議併用自我血糖監測或糖化白蛋白判讀。`,patientMessage:`您的糖化血色素是 ${T.min===T.max?T.min:`${T.min}–${T.max}`}%，看起來在目標範圍內，但這個數字對您可能不準。${S?`腎功能下降`:``}${S&&w?`與`:``}${w?`貧血`:``}都會讓它比實際血糖低。請不要只看這個數字就認為血糖控制良好，回診時請醫療團隊一起看您平時的血糖紀錄。`,citation:null});let ee=[r(`fasting-glucose`),r(`postprandial-glucose`),r(`glucose-unspecified`)].filter(e=>!!e),E=ee.length?Math.min(...ee.map(e=>e.min)):null;E!==null&&E<70&&n.push({code:`hypoglycemia`,analyte:null,ruleId:`hypoglycemia-levels`,severity:E<54?`urgent`:`attention`,clinicianMessage:`Glucose 曾出現 ${E} mg/dL，屬低血糖範圍${E<54?`（低於 54，屬嚴重低血糖）`:``}。`,patientMessage:`您的資料中曾出現偏低的血糖數值。低血糖可能造成發抖、冒冷汗、頭暈或意識改變，請在回診時主動提出，讓醫療團隊了解發生的情況。`,citation:null});let D=r(`glucose-unspecified`);return D&&D.max>=200&&n.push({code:`glucose-unspecified-high`,analyte:`glucose-unspecified`,ruleId:null,severity:D.max>=300?`urgent`:`attention`,clinicianMessage:`Glucose 曾出現 ${D.max} mg/dL${i(D)}。${St}`,patientMessage:`您的資料中曾出現偏高的血糖數值。這些紀錄沒有註明是飯前還是飯後測的，也沒有檢查日期，請在回診時和醫療團隊一起看實際結果。`,citation:null}),n}function Tt(e){let t=_t(e),n=t.find(e=>e.analyte===`eGFR`),r=t.find(e=>e.analyte===`UACR`);if(n&&n.min<60)return{triggered:!0,reason:`檢驗數據顯示 eGFR 曾低於 60（最低 ${n.min}）`};let i=r?.values.filter(e=>e.value>300||e.value===300&&e.qualifier===`>=`);return i?.length?{triggered:!0,reason:`檢驗數據顯示 UACR 曾達到或超過 300 mg/g（${[...new Set(i.map(e=>e.raw))].join(`、`)}）`}:{triggered:!1,reason:``}}var Et=`你是協助整理檢驗報告的助手，讀者是忙碌的醫師。

輸入分兩部分：先是這位病人的基本資料（含性別 gender 與生日 birthday，以及已發生併發症 R 與風險預測 PR 的原始欄位），接著是健保申報檢驗紀錄原文，每一筆包含項目名稱、數值、單位與來源提供的參考值。

輸入不含用藥資料。不要推測或提及任何藥物。

請直接讀這些紀錄，判斷哪些項目異常，並整理成醫師 60 秒內看得完的形式。

**只列出與糖尿病長期照護有關的異常。**判斷標準有兩層，兩層都要通過：

第一層，這個異常要跟糖尿病有關——是糖尿病或其併發症造成的、會影響糖尿病治療決策、或會影響糖尿病用藥安全。包括血糖與糖化血色素、腎功能與尿液白蛋白、血脂、肝功能、電解質、與腎病變相關的貧血。

第二層，這個異常要能代表**持續的狀態**，而不是某一次急性事件的當下切片。這批紀錄沒有採檢日期，無法分辨一筆數值是本月測的還是兩年前住院時測的。因此只反映當下急性狀況的項目一律不列，即使數值再誇張：白血球與白血球分類、發炎指標、細菌培養、血液氣體與酸鹼、血液滲透壓、凝血功能。那些沒有時間點就無法判讀，列出來只會讓人誤以為是目前狀態。

其他與糖尿病無關的異常也不要列出：心肌指標、腫瘤標記、甲狀腺功能、與腎病變無關的血液學異常。醫師會另外看那些；放進這份報告只會讓真正要看的東西被淹沒。

判讀原則：
- 以每一筆自己帶的參考值為主要依據。參考值有多種寫法，例如上下限分放兩格、兩格各放整段區間、不等式、或純文字說明；也有很多筆根本沒有參考值。
- 糖尿病人的血糖與糖化血色素要用糖尿病控制目標判讀，不可直接套用健康人的參考範圍。空腹血糖目標 80–130 mg/dL、糖化血色素一般成人低於 7.0%（高齡者依健康狀態放寬）。
- 尿液檢查與血液檢查是不同東西。同名項目（例如 WBC、Glucose）出現在尿液與血液時，判讀依據完全不同，不可混為一談。
- 由 HbA1c 換算出來的估計平均血糖（eAG）不是實測血糖。
- 資料很髒。單位可能是「無」「NIL」這種佔位字、值可能是文字或陰陽性符號、項目名稱可能有亂碼。看不懂的就說看不懂，不要硬猜。

嚴格限制：
- 只能使用輸入中實際出現的項目名稱與數值。每一個數值都會被逐一比對來源，寫出來源沒有的數字會被標記出來。
- worst 欄位只放一個數值。把兩個值寫成一個字串會讓比對失敗，該筆會被標記為不可信。
- 半定量與定性結果（例如尿蛋白 3+、潛血 4+、(-)、Negative）也要判讀，不要因為不是數字就略過。
- 參考值若依年齡或性別分層（例如 [0-14d] … [15-30d] … [≧18y]M 4-5.52 F 3.78-4.99 這種寫法），必須依開頭基本資料的 gender 與 birthday 算出本人的年齡層與性別，取對應的那一段判讀，不要用第一段，也不要兩段都列。判讀理由中要寫出你用的是哪一段。
- 參考值若標註修訂日期（例如「2019/7/1起 ≧18years 變更為 …」），一律以修訂後的區間為準。
- 不得推測診斷，不得提出處置建議。
- 這些紀錄只有費用年月、沒有採檢日期，不得敘述趨勢、先後順序或「最近一次」。
- 數值可能來自兩年前的急性事件，不得當成目前狀態。
- 若某一組看起來是急性事件、檢體條件或資料標示問題而非臨床發現，就直說，不要硬掰意義。

輸出格式：只輸出一個 JSON 物件，不要加說明文字或程式碼圍籬。

{
  "abnormal": [
    {
      "item": "項目名稱，逐字照抄",
      "worst": "最偏離的那一個數值，逐字照抄。只放一個值，不要寫成「A (high) / B (low)」，高低都有時把較嚴重的放這裡、另一個放 worst_other",
      "worst_other": "另一個方向的極值，沒有就填空字串",
      "unit": "單位，沒有就填空字串",
      "reference": "該筆的參考值原文",
      "direction": "high | low | both",
      "why": "為什麼判為異常，30 字以內"
    }
  ],
  "groups": [
    { "system": "系統名稱", "items": ["項目名稱"], "pattern": "一句話描述整體型態，並說明它與糖尿病的關聯" }
  ],
  "worth_a_look": ["值得醫師優先看的組合與理由，每則 60 字以內"],
  "data_quality_notes": ["讀的過程中發現的資料品質問題，每則 60 字以內；沒有則留空陣列"]
}`,Dt=/^(06012C|06013C)$/;function Ot(e){let t=String(e).trim().match(/-?\d+(?:\.\d+)?/);return t?String(Number(t[0])):null}function kt(e){let t=e.indexOf(`【檢驗與檢查紀錄】`);if(t===-1)return``;let n=e.indexOf(`【其他來源的非空紀錄】`,t),r=e.slice(t,n===-1?void 0:n),i=e.indexOf(`【用藥紀錄】`),a=i===-1?``:e.slice(0,i).trimEnd();return a?`${a}\n\n${r}`:r}function At(e,t){let n=e.trim(),r=n.match(/```(?:json)?\s*([\s\S]*?)```/i),i=r?r[1].trim():n,a;try{a=JSON.parse(i)}catch{let e=i.indexOf(`{`),t=i.lastIndexOf(`}`);if(e===-1||t<=e)throw Error(`檢驗判讀器沒有回傳可解析的 JSON。`);a=JSON.parse(i.slice(e,t+1))}let o=a??{},s=e=>Array.isArray(e)?e.filter(e=>typeof e==`string`).map(String):[],c=(Array.isArray(o.abnormal)?o.abnormal:[]).filter(e=>!!e&&typeof e==`object`).map(e=>({item:String(e.item??``).trim(),worst:String(e.worst??``).trim(),worstOther:String(e.worst_other??``).trim(),unit:String(e.unit??``).trim(),reference:String(e.reference??``).trim(),direction:String(e.direction??``).trim(),why:String(e.why??``).trim()})).filter(e=>e.item),l=new Set(t.labItems.map(e=>e.itemName)),u=new Set,d=0;for(let e of t.labItems)for(let t of e.rawValues){d+=1;let e=Ot(t);e!==null&&u.add(e)}let f=e=>e.toLowerCase().replace(/[（）()\[\]｜|、，,。.\s_-]/g,``),p=t.labItems.map(e=>({key:f(e.itemName),values:new Set(e.rawValues.map(Ot).filter(e=>e!==null))})),m=(e,t)=>{let n=f(e);return n?p.filter(e=>e.key===n||e.key.includes(n)||n.includes(e.key)).some(e=>e.values.has(t)):!1},h=c.filter(e=>{for(let t of[e.worst,e.worstOther]){if(!t)continue;let n=Ot(t);if(n!==null&&!m(e.item,n))return!0}return!1}),g=[...new Set(c.map(e=>e.item).filter(e=>!l.has(e)))],_=e=>e.orderCodes.some(e=>Dt.test(e)),v=new Map;for(let e of t.labItems)v.set(e.itemName,[...v.get(e.itemName)??[],e]);for(let e of c){if(/尿|urine|dipstick/i.test(e.item))continue;let t=v.get(e.item)??[];if(!t.length)continue;let n=t.filter(t=>[e.worst,e.worstOther].some(e=>e&&t.rawValues.some(t=>t.trim()===e.trim()||Ot(t)===Ot(e))));(n.length?n:t).every(_)&&(e.item=`${e.item}（尿液）`)}return{review:{abnormal:c,groups:(Array.isArray(o.groups)?o.groups:[]).filter(e=>!!e&&typeof e==`object`).map(e=>({system:String(e.system??``).trim(),items:(Array.isArray(e.items)?e.items:[]).map(String),pattern:String(e.pattern??``).trim()})).filter(e=>e.system),worth_a_look:s(o.worth_a_look),data_quality_notes:s(o.data_quality_notes)},unverifiedValues:h,unknownItems:g,sourceRecords:d}}function jt(e,t=new Set){let{review:n}=e,r=[],i=n.abnormal.filter(e=>{let n=mt(e.item,e.unit||null);return!(n&&t.has(n))});if(r.push(`  以下由輔助判讀器讀取 ${e.sourceRecords} 筆原始紀錄判定，只列與糖尿病相關且非急性事件當下的異常。`),i.length)for(let t of i){let n=!!t.unit&&t.worst.replace(/\s+/g,``).toLowerCase().endsWith(t.unit.replace(/\s+/g,``).toLowerCase()),i=t.unit&&!n?` ${t.unit}`:``,a=t.worstOther?`／另一端 ${t.worstOther}`:``,o=e.unverifiedValues.includes(t)?`  ⚠ 此數值在來源中找不到`:``;r.push(`  ${t.item}：${t.worst}${i}${a}（參考 ${t.reference||`來源未提供`}）${t.why?`｜${t.why}`:``}${o}`)}else r.push(`  （無其他與糖尿病相關的異常）`);for(let e of n.groups)r.push(`  ${e.system}：${e.pattern}`);if(n.worth_a_look.length){r.push(`  值得優先看：`);for(let e of n.worth_a_look)r.push(`    - ${e}`)}if(n.data_quality_notes.length){r.push(`  判讀器提到的資料品質問題：`);for(let e of n.data_quality_notes)r.push(`    - ${e}`)}return(e.unverifiedValues.length||e.unknownItems.length)&&(r.push(`  ⚠ 抄寫檢查：`),e.unverifiedValues.length&&r.push(`    ${e.unverifiedValues.length} 筆引用的數值在來源中找不到（已於上方逐筆標示）。`),e.unknownItems.length&&r.push(`    來源沒有這些項目名稱：${e.unknownItems.join(`、`)}`)),r.join(`
`)}var Mt=`你要為一位糖尿病人寫「檢驗數值」這一段衛教內容，讀者是病人本人，不是醫療人員。

輸入分三部分：這位病人的基本資料（含性別 gender 與生日 birthday）、健保申報檢驗紀錄原文、以及一份程式初步判定「可能完全沒有紀錄」的核心指標清單。輸入不含用藥資料，不要推測或提及任何藥物。

**那份清單是待你核對的假設，不是事實。** 它是程式用項目名稱比對出來的，而各院的名稱寫法差很多（同一個檢驗可能寫成 Glu-AC、GLU_AC 或血液及體液葡萄糖），程式曾經因此整批漏抓。請你自己在紀錄裡找一遍：確實找不到的才寫進文中；若你在紀錄裡找到了，就不要說它沒做，並把它列進 found_after_all。

寫作原則：
- 依生理系統分段，例如血糖、腎臟、血液、電解質。同一段裡把相關的數值串起來講，不要一項一句。
- **先講結論，數字只用來佐證。** 每一段開頭要先說這組數值代表什麼（穩定、偏高、波動大、需要注意），再舉數字。
- **同一個項目最多舉兩個數字**——通常是最低與最高，或最能說明問題的那一個。逐筆列出所有數值是把資料倒出來，不是摘要，病人讀不下去。多筆數值請改用「介於 X 到 Y 之間」或「多數落在 X 附近，但曾出現 Y」這種寫法。
- 同一項檢驗在不同院所有不同名稱時（例如 Glucose AC、Glucose AC (POCT)、Sugar AC 都是飯前血糖），合併成一項講，不要並列成好幾個名稱。
- 一段以四到六句為度。
- **觀察摘要只描述數值代表什麼，不給行動建議**。要病人做什麼一律留到短期建議那一段，這裡寫了會和後面重複，也容易在沒有足夠資訊時給錯建議。
- 只寫與糖尿病長期照護有關的項目。與糖尿病無關的異常不要寫，即使數值再誇張。
- 只反映某一次急性事件當下狀態的項目不要寫：白血球與白血球分類、發炎指標、細菌培養、血液氣體與酸鹼、凝血功能。這批紀錄沒有採檢日期，寫了會讓人誤以為是目前狀態。
- 參考值若依年齡或性別分層，依基本資料算出本人的年齡層與性別，取對應的那一段判讀。
- 用一般人看得懂的話。醫學縮寫第一次出現時用中文說明。
- 經你核對後確實找不到的核心指標，每一項都要在文中提到，說明那是評估什麼用的、以及可以在回診時確認是否需要安排。缺檢和異常一樣值得病人知道。
- 清單以外的項目不要說「沒有做」——你只需要核對清單上那幾項。
- 不要寫開場白或結語，只寫這一段本身。

嚴格禁止：
- 不得使用輸入中沒有出現的數值。每一個數字都會被逐一比對來源。
- 不得推測診斷，不得寫出任何病名作為結論。
- 不得提出處置建議，不得叫病人開始、停止、調整任何藥物或治療。
- 不得敘述趨勢、先後順序、「最近一次」、「已改善」、「持續惡化」。這批紀錄只有費用年月、沒有採檢日期。
- 不得把數值寫成目前狀態；數值可能來自兩年前的急性事件。

除了「觀察摘要」，你還要寫兩段：

**短期建議**：病人這一兩週內就能開始做的事，側重生活形態調整與用藥安全提醒。**用編號清單，一點一個動作**，寫清楚做什麼、什麼時候做，不要寫「注意飲食」這種沒有動作的句子，也不要寫成一整段文字。用藥只能提「安全提醒」——例如生病無法進食時哪類藥要先與醫療團隊確認——不得叫病人自行開始、停止或調整任何藥物。

**不得自訂任何具體的攝取量或運動處方**：毫升、公克、大卡、分鐘、公斤、次數都不行。這些對不同病人可能相反——例如腎功能不全的人水分、蛋白質、鹽分與鉀往往需要限制而非補充，寫「每日喝 1500–2000 毫升」對他們可能有害。要提這類事情，請寫成「請醫療團隊或營養師為您訂出適合的份量」。

**中期目標**：下一階段（約三個月至下次回診）要達到的控制指標。輸入會給你一份「程式依指引推出的目標值」，**目標數字一律照抄那份清單，不得自己訂、不得換算、不得補上清單沒有的指標**。你的工作是把它寫成病人的話，並依這位病人的檢驗數值說明離目標還有多遠。清單是空的就不要編。

比較時的說法要注意：這批紀錄沒有採檢日期，**不能說「目前是 X」「現在的數值為 X」「最近一次是 X」**——我們無法確認哪一筆是現在的狀態。請改寫成「紀錄中曾出現 X」「紀錄中的 X 已在目標範圍內」「紀錄中最低／最高曾到 X」。若某項指標在紀錄中完全沒有，就說明還沒有這項數據、建議回診時安排，不要留空也不要猜。

三段都適用上面的寫作原則與嚴格禁止事項。

輸出格式：只輸出一個 JSON 物件，不要加說明文字或程式碼圍籬。

{
  "narrative": "觀察摘要整段內容，段落之間用 \\n\\n 分隔",
  "short_term": "短期建議整段內容",
  "mid_term": "中期目標整段內容",
  "cited_values": [
    { "item": "項目名稱，逐字照抄來源", "value": "你在文中引用的數值，逐字照抄" }
  ],
  "found_after_all": [
    { "item": "程式說沒有、但你在紀錄中找到的核心指標", "as": "它在紀錄中實際的項目名稱" }
  ]
}`;function Nt(e,t,n){let r=gt(_t(t));return[kt(e),`【程式初步判定：可能完全沒有紀錄的核心指標（待你核對）】`,r.length?r.map(e=>`- ${e}`).join(`
`):`（無，核心指標都有紀錄）`,`【程式依指引推出的目標值（中期目標一律照抄，不得自訂）】`,n?.targets.length?n.targets.map(e=>`- ${e.metric}：${e.value}`).join(`
`):`（無，這位病人解不出可用的目標值——請不要在中期目標段編任何數字）`,`【程式依指引推出的追蹤間隔】`,n?.followUp?.trim()?n.followUp.trim():`（無）`].join(`

`)}var Pt=[{pattern:/最近一次|最新一筆|目前的?數值為|已(改善|惡化)|持續(上升|下降|惡化)|趨勢/,label:`聲稱時序或趨勢`},{pattern:/建議(您)?(開始|停用|停止|加|減|換|調整).{0,6}(藥|劑量|治療)|應(停用|加藥|減量)/,label:`處置建議`},{pattern:/(診斷為|確診為|罹患了|您(有|患有)).{0,10}(症|病變|症候群)/,label:`推測診斷`}],Ft=new Set([`1`,`2`,`3`,`4`,`5`,`15`,`24`,`119`,`1925`,`1.73`]),It=new Set(E.flatMap(e=>[...`${e.statement} ${e.targetValue??``} ${e.patientStatement??``}`.matchAll(/(?<![\d.])\d+(?:\.\d+)?(?![\d.])/g)].map(e=>String(Number(e[0])))));function Lt(e){let t=String(e).trim().match(/-?\d+(?:\.\d+)?/);return t?String(Number(t[0])):null}function Rt(e,t){let n=e.trim(),r=n.match(/```(?:json)?\s*([\s\S]*?)```/i),i=r?r[1].trim():n,a;try{a=JSON.parse(i)}catch{let e=i.indexOf(`{`),t=i.lastIndexOf(`}`);if(e===-1||t<=e)throw Error(`檢驗敘述器沒有回傳可解析的 JSON。`);a=JSON.parse(i.slice(e,t+1))}let o=a??{},s=String(o.narrative??``).trim(),c=String(o.short_term??``).trim(),l=String(o.mid_term??``).trim(),u=[s,c,l].filter(Boolean).join(`

`),d=(Array.isArray(o.cited_values)?o.cited_values:[]).filter(e=>!!e&&typeof e==`object`).map(e=>({item:String(e.item??``).trim(),value:String(e.value??``).trim()})).filter(e=>e.value),f=e=>e.toLowerCase().replace(/[（）()\[\]｜|、，,。.\s_-]/g,``).replace(/[０-９]/g,e=>String.fromCharCode(e.charCodeAt(0)-65248)),p=t.labItems.map(e=>({key:f(e.itemName),values:new Set(e.rawValues.map(Lt).filter(e=>e!==null))})),m=d.filter(e=>{let t=Lt(e.value);if(t===null)return!1;let n=f(e.item);return n?!p.filter(e=>e.key===n||e.key.includes(n)||n.includes(e.key)).some(e=>e.values.has(t)):!0}),h=new Set(d.map(e=>Lt(e.value)).filter(e=>e!==null)),g=[...new Set([...u.matchAll(/(?<![\d.])\d+(?:\.\d+)?(?![\d.])/g)].map(e=>e[0]).filter(e=>{let t=Lt(e);return t!==null&&!h.has(t)&&!Ft.has(t)&&!It.has(t)}))],_=Pt.filter(e=>e.pattern.test(u)).map(e=>e.label);return{narrative:s,shortTerm:c,midTerm:l,foundAfterAll:(Array.isArray(o.found_after_all)?o.found_after_all:[]).filter(e=>!!e&&typeof e==`object`).map(e=>({item:String(e.item??``).trim(),as:String(e.as??``).trim()})).filter(e=>e.item),unverifiedValues:m,uncitedNumbers:g,bannedPhrases:_}}function zt(e){let t=[];return e.unverifiedValues.length&&t.push(`引用了來源中找不到的數值：${e.unverifiedValues.map(e=>`${e.item} ${e.value}`).join(`、`)}`),e.uncitedNumbers.length&&t.push(`文中這些數字既不在引用清單也不在指引門檻表，未經比對：${e.uncitedNumbers.join(`、`)}`),e.bannedPhrases.length&&t.push(`可能踩到禁止事項：${e.bannedPhrases.join(`、`)}`),e.foundAfterAll.length&&t.push(`程式判定為缺檢但實際存在：${e.foundAfterAll.map(e=>`${e.item}（紀錄中寫作 ${e.as}）`).join(`、`)}——項目名稱比對有漏，需修正`),t}function Bt(e){let t=[e.narrative],n=zt(e);return n.length&&t.push(``,`⚠ 這一段未通過自動檢查，不可直接提供給病人：${n.join(`；`)}`),t}function Vt(e){let t=D.get(e);if(!t)throw Error(`規則不存在：${e}`);return t}function Y(e,t,n,r=!1){let i=Vt(t);return{metric:e,value:i.statement,ruleId:t,reason:n,needsClinicianConfirmation:r,citation:O(i)}}function Ht(e){return e.existingComplications.filter(e=>(e.value??0)>0).map(e=>Number(e.code.slice(1)))}function Ut(e,t){let n=[],r=[],i=[],a=Ht(e),o=t??a.length,s=a.includes(5),c=a.includes(2),l=a.includes(3)||e.comorbidityFlags.ckd.known&&e.comorbidityFlags.ckd.value,u=e.ageYears.known?e.ageYears.value:null,d=u!==null&&u>=65,f=e.diabetesType.verdict===`type1-confirmed`,p=(e,t)=>f?e:t;if(!d)n.push(Y(`糖化血色素`,p(`t1-hba1c-general`,`hba1c-general`),u===null?`年齡未知，先套用一般成人通則`:`年齡 ${u} 歲，未達 65 歲高齡放寬條件`,u===null)),n.push(Y(`空腹血糖`,p(`t1-fpg-adult`,`fpg-general`),`一般成人通則`)),n.push(Y(`餐後血糖`,p(`t1-ppg-adult`,`ppg-general`),`一般成人通則`));else{let t=`DCSI ${e.dcsiTotal.known?e.dcsiTotal.value:`未知`}，已發生併發症 ${o} 項`;n.push({metric:`糖化血色素`,value:null,ruleId:null,reason:`年齡 ${u} 歲屬高齡，指引依健康狀態分為三級（低於 7–7.5%／低於 8.0%／不以糖化血色素為唯一目標）。健康狀態需評估共病、認知與身體機能及預期餘命，申報資料無法判定。目前可得的負擔指標：${t}。`,needsClinicianConfirmation:!0,citation:O(Vt(`hba1c-elderly-intermediate`))}),i.push(`高齡者的健康狀態分級，因此糖化血色素、空腹與餐後血糖目標都需醫療團隊定案。`)}if(e.comorbidityFlags.ckd.known&&e.comorbidityFlags.ckd.value){let e=Vt(`hba1c-unreliable`);r.push({code:`hba1c-reliability`,severity:`attention`,message:e.statement,ruleId:e.id,citation:O(e)})}let m=l||Tt(e).triggered,h=s||c||m,g=s||c?`資料顯示已有${s?`心血管`:``}${s&&c?`與`:``}${c?`腦血管`:``}疾病，屬可考慮加嚴的族群；是否可耐受需醫療團隊評估。`:`資料顯示有腎臟問題或蛋白尿，指引對這一族群建議加嚴血壓目標；是否可耐受需醫療團隊評估。`;h?(n.push(Y(`血壓`,p(`t1-bp-target-intensive`,`bp-target-intensive`),g,!0)),d&&r.push({code:`orthostatic-risk`,severity:`attention`,message:`高齡合併心血管或腦血管疾病，降壓過於嚴格可能增加姿勢性低血壓與跌倒風險，血壓目標需個別化。`,ruleId:p(`t1-bp-target-intensive`,`bp-target-intensive`),citation:O(Vt(p(`t1-bp-target-intensive`,`bp-target-intensive`)))})):n.push(Y(`血壓`,p(`t1-bp-target-general`,`bp-target-general`),`未見已發生的心血管或腦血管疾病，也未見腎臟問題或蛋白尿，套用一般目標`)),s||c?n.push(Y(`低密度脂蛋白膽固醇`,`ldl-cvd`,`資料顯示已有心血管或腦血管疾病`)):n.push(Y(`低密度脂蛋白膽固醇`,`ldl-general`,`一般糖尿病人通則`)),n.push(Y(`高密度脂蛋白膽固醇`,`hdl-target`,e.sex.known?e.sex.value:`性別未知，兩個目標值都列出`,!e.sex.known)),n.push(Y(`三酸甘油酯`,`tg-target`,`一般糖尿病人通則`));let _=e.labItems.find(e=>/eGFR/i.test(e.itemName));return e.medicationClasses.some(e=>/抗糖尿病|metformin|雙胍/i.test(e.atcClass))&&!_&&i.push(`資料中有抗糖尿病藥物的申報紀錄，但沒有可用的 eGFR 數值，因此無法依指引判定 metformin 的腎功能安全性。`),l&&!_&&i.push(`資料標記腎臟相關問題，但沒有可用的 eGFR 或 UACR 數值可供判定追蹤頻率。`),!e.labHasDrawDates&&e.labRecordCount>0&&i.push(`檢驗資料只有費用年月、沒有採檢日，因此無法判定任何一項是否為「最近一次」，也無法建立趨勢。`),e.diabetesType.verdict!==`type1-confirmed`&&e.diabetesType.verdict!==`type2-confirmed`&&i.push(`糖尿病類型判定為 ${e.diabetesType.verdict}，上列目標一律套用第 2 型指引的數值。兩型的數值有實際差異（例如餐後血糖第 2 型為 80–160 mg/dL、第 1 型成人為低於 180 mg/dL），若這位病人是第 1 型，餐後血糖與追蹤起始時機都需重新判定。`),f&&i.push(`已依申報診斷碼判定為第 1 型，目標與追蹤間隔改用第 1 型指引。第 1 型的腎臟、眼底與神經篩檢起始時機取決於發病年份與年齡（發病滿 5 年、青春期或大於 10 歲），而申報資料判定不了發病年份，因此起始時機需醫療團隊確認。`),{targets:n,safetyFlags:r,undetermined:i}}function Wt(e){let t=D.get(e);return t?O(t):null}function Gt(e){let t=D.get(e);return t?k(t):null}function Kt(e){let t=e.existingComplications.filter(e=>(e.value??0)>0).map(e=>Number(e.code.slice(1)));return t.includes(2)||t.includes(5)}function qt(e,t){let n=[],r=t=>e.find(e=>e.analyte===t),i=t.ageYears.known?t.ageYears.value:null,a=i!==null&&i>=65,o=t.diabetesType.verdict===`type1-confirmed`,s=r(`HbA1c`);if(s){let e=s.max,t=e>(a?8:7);n.push({analyte:`HbA1c`,label:`糖化血色素`,worst:e,target:a?`高齡者依健康狀態分為 <7–7.5%／<8.0%／不以此為唯一目標`:`低於 7.0%`,outOfTarget:t,severity:e>=10?`urgent`:t?`attention`:`info`,clinicianMessage:t?`HbA1c 曾出現 ${e}%，超過${a?`指引高齡分級中最寬的數值門檻 8.0%（健康狀況差者不以糖化血色素為唯一目標，需醫療團隊判定）`:`一般成人目標 7.0%`}。`:`HbA1c 曾出現 ${e}%，未超過${a?`高齡分級中最寬的數值門檻 8.0%`:`一般成人目標 7.0%`}。`,patientMessage:t?`您的資料中曾出現偏高的糖化血色素（${e}%）。這是反映一段期間平均血糖的指標，請與醫療團隊確認適合您的目標值與下一步。`:null,citation:Wt(a?`hba1c-elderly-intermediate`:o?`t1-hba1c-general`:`hba1c-general`),citationShort:Gt(a?`hba1c-elderly-intermediate`:o?`t1-hba1c-general`:`hba1c-general`),targetNeedsConfirmation:a})}let c=r(`postprandial-glucose`);if(c){let e=c.max,t=o?180:160,r=e>t;n.push({analyte:`postprandial-glucose`,label:`餐後血糖`,worst:e,target:o?`低於 180 mg/dL`:`80–160 mg/dL`,outOfTarget:r,severity:e>=250?`attention`:`info`,clinicianMessage:`Glucose PC 曾出現 ${c.min}–${c.max} mg/dL${r?`，最高超過目標上限 ${t}`:``}。`,patientMessage:r?`您的資料中曾出現偏高的餐後血糖（最高 ${e} mg/dL）。這些紀錄沒有附檢查日期，請在回診時和醫療團隊一起看實際結果。`:null,citation:Wt(o?`t1-ppg-adult`:`ppg-general`),citationShort:Gt(o?`t1-ppg-adult`:`ppg-general`),targetNeedsConfirmation:a})}let l=r(`fasting-glucose`);if(l){let e=l.max,t=e>130;n.push({analyte:`fasting-glucose`,label:`飯前血糖`,worst:e,target:`80–130 mg/dL（高齡或多重共病可放寬至 90–150）`,outOfTarget:t,severity:e>=250?`attention`:`info`,clinicianMessage:`Glucose AC 曾出現 ${l.min}–${l.max} mg/dL${t?`，最高超過一般成人目標上限 130`:``}。`,patientMessage:t?`您的資料中曾出現偏高的飯前血糖（最高 ${e} mg/dL）。這些紀錄沒有附檢查日期，請在回診時和醫療團隊一起看實際結果。`:null,citation:Wt(o?`t1-fpg-adult`:`fpg-general`),citationShort:Gt(o?`t1-fpg-adult`:`fpg-general`),targetNeedsConfirmation:a})}let u=r(`LDL-C`);if(u){let e=Kt(t),r=e?70:100,i=u.max,a=i>r;n.push({analyte:`LDL-C`,label:`低密度脂蛋白膽固醇`,worst:i,target:`低於 ${r} mg/dL`,outOfTarget:a,severity:a?`attention`:`info`,clinicianMessage:`LDL-C 曾出現 ${i} mg/dL，目標低於 ${r}（${e?`已有心血管或腦血管疾病`:`一般糖尿病人`}）。`,patientMessage:a?`您的資料中曾出現偏高的低密度脂蛋白膽固醇（${i} mg/dL）。請與醫療團隊確認您的目標值。`:null,citation:Wt(e?`ldl-cvd`:`ldl-general`),citationShort:Gt(e?`ldl-cvd`:`ldl-general`),targetNeedsConfirmation:!1})}let d=r(`HDL-C`);if(d){let e=d.min,t=e<40,r=e<50;n.push({analyte:`HDL-C`,label:`高密度脂蛋白膽固醇`,worst:e,target:`男性高於 40、女性高於 50 mg/dL`,outOfTarget:r,severity:t?`attention`:`info`,clinicianMessage:t?`HDL-C 曾出現 ${e} mg/dL，低於男女兩種目標值。`:r?`HDL-C 曾出現 ${e} mg/dL，若為女性則低於目標（>50）；來源性別代碼意義未確認。`:`HDL-C 曾出現 ${e} mg/dL。`,patientMessage:t?`您的資料中曾出現偏低的高密度脂蛋白膽固醇（${e} mg/dL）。請與醫療團隊確認是否需要處理。`:null,citation:Wt(`hdl-target`),citationShort:Gt(`hdl-target`),targetNeedsConfirmation:!t&&r})}let f=r(`triglyceride`);if(f){let e=f.max,t=e>=150;n.push({analyte:`triglyceride`,label:`三酸甘油酯`,worst:e,target:`低於 150 mg/dL`,outOfTarget:t,severity:e>=500?`urgent`:t?`attention`:`info`,clinicianMessage:`三酸甘油酯曾出現 ${e} mg/dL${e>=500?`，達到需藥物處理的門檻`:t?`，高於目標 150`:``}。`,patientMessage:t?`您的資料中曾出現偏高的三酸甘油酯（${e} mg/dL）。請與醫療團隊確認是否需要調整。`:null,citation:Wt(`tg-target`),citationShort:Gt(`tg-target`),targetNeedsConfirmation:!1})}return n}function Jt(e){return e.filter(e=>e.outOfTarget)}var Yt={eGFR:`KIDNEY-CORE`,UACR:`KIDNEY-CORE`,creatinine:`KIDNEY-CORE`,"LDL-C":`HEART-CORE`,"HDL-C":`HEART-CORE`,triglyceride:`HEART-CORE`},Xt={2:`積極照護`,1:`適度介入`,0:`日常維持`},Zt={1:`EYE-CORE`,2:`STROKE-CORE`,3:`KIDNEY-CORE`,4:`NERVE-CORE`,5:`HEART-CORE`,6:`LEG-CIRCULATION-CORE`},Qt={1:`視網膜病變`,2:`腦血管疾病`,3:`腎臟病變`,4:`神經病變`,5:`心血管疾病`,6:`周邊血管疾病`,7:`代謝性急症`};function $t(e){let t=[],n=e.comorbidityFlags.ckd,r=n.known&&n.value,i=e.ckdIcdCodes,a=Tt(e);for(let n=1;n<=6;n+=1){let o=e.existingComplications.find(e=>e.code===`R${n}`),s=e.riskPredictions.find(e=>e.code===`PR${n}`),c=!!o?.present,l=c?o?.value??null:null,u=s?.present?s.value:null,d={topic:n,topicName:Qt[n],moduleId:Zt[n],rValue:l,prValue:u};if(l!==null&&l>0){t.push({...d,kind:`established`,reason:`R${n}=${l}，屬已發生的併發症現況。`});continue}if(n===3&&(r||i.length>0||a.triggered)){let e=r?`來源 CKD 欄位為 1`:i.length>0?`申報診斷碼出現慢性腎臟病（${i.join(`、`)}）`:a.reason,n=!r&&i.length===0;t.push({...d,kind:`established`,provisional:n,reason:n?`${e}。資料只有費用年月、沒有採檢日期，無法確認是否持續三個月以上（KDIGO 對慢性腎臟病的定義要求持續三個月以上），因此列為需確認而非確診；衛教內容照納入。`:`${e}，即使 R3${c?`=${l}`:` 缺值`} 也以已發生處理。`});continue}if(u===2){t.push({...d,kind:`prevention-active`,reason:`來源以 PR${n}=2（${Xt[2]}）呈現、未輸出 R${n}，依資料模型代表尚未發生；納入預防內容。`});continue}if(u===1){t.push({...d,kind:`prevention-moderate`,reason:`PR${n}=1（${Xt[1]}），尚未發生；納入預防內容。`});continue}if(u===0){t.push({...d,kind:`excluded`,reason:`PR${n}=0（${Xt[0]}），維持既有照護即可，不納入主題內容。`});continue}t.push({...d,kind:`excluded`,reason:`來源同時未提供 R${n} 與 PR${n}，無從判斷是否發生，不得補值，因此不納入。`})}return t}var en=`你是糖尿病照護資料的稽核者，讀者是醫療團隊，不是病人。

重要：哪些併發症主題要納入報告、個別化目標與追蹤間隔，**全部已由程式依 R／PR 與指引門檻表判定完成**，你不需要也不能改變。病人可見的衛教正文也由程式以已核准的固定文字組合，你寫的任何文字都不會出現在病人版。

你只做兩件規則做不到的事：

1. **找出資料本身的矛盾與限制**。例如：基本資料的共病旗標與檢驗數值互相矛盾、申報用藥距報告日過久而不能代表目前用藥、關鍵指標完全缺漏、同一項檢驗在不同院所名稱不一致而可能被程式漏抓。
2. **提醒醫療團隊需要人工確認的地方**。以「請確認什麼」的句型寫，不要下結論。

如果你認為程式的主題判定有問題，寫在 disagreements。意見會記錄下來供人工檢視，但不會覆寫程式判定——這個管道曾經抓到程式把缺值當成 0 的真實錯誤。

限制：
- 不得推測資料沒有的診斷、檢驗、日期或目前用藥。
- 申報用藥只代表曾有申報紀錄，不得當成目前正在使用。
- 不得提出停藥、加藥、換藥或調整劑量的建議。
- 每一則都要能指回輸入中的具體欄位或數值，不要寫泛泛的注意事項。

輸出格式：只輸出一個 JSON 物件，不要加說明文字或程式碼圍籬。

{
  "echo": { "age_years": 輸入中的年齡數字, "dcsi": 輸入中的 DCSI 總分（沒有就填 null） },
  "clinician_notes": ["需要醫療團隊確認的事，每則 80 字以內"],
  "data_concerns": ["資料本身的矛盾或限制，每則 80 字以內"],
  "disagreements": [
    { "topic": "R3", "program_decision": "程式的判定", "your_view": "你的看法與理由" }
  ]
}`;function tn(e){let t=e.trim(),n=t.match(/```(?:json)?\s*([\s\S]*?)```/i),r=n?n[1].trim():t,i;try{i=JSON.parse(r)}catch{let e=r.indexOf(`{`),t=r.lastIndexOf(`}`);if(e===-1||t<=e)throw Error(`輔助判讀器沒有回傳可解析的 JSON。`);i=JSON.parse(r.slice(e,t+1))}if(!i||typeof i!=`object`)throw Error(`輔助判讀器回傳的不是 JSON 物件。`);let a=i,o=e=>Array.isArray(e)?e.filter(e=>typeof e==`string`).map(String):[],s=a.echo??null,c=e=>typeof e==`number`&&Number.isFinite(e)?e:null;return{echo:s?{ageYears:c(s.age_years),dcsi:c(s.dcsi)}:null,clinician_notes:o(a.clinician_notes),data_concerns:o(a.data_concerns),disagreements:(Array.isArray(a.disagreements)?a.disagreements:[]).filter(e=>!!e&&typeof e==`object`).map(e=>({topic:String(e.topic??``).trim(),program_decision:String(e.program_decision??``).trim(),your_view:String(e.your_view??``).trim()})).filter(e=>e.topic)}}function nn(e,t){let n=$t(t),r=n.filter(e=>e.kind===`established`).sort((e,t)=>(t.rValue??0)-(e.rValue??0)||e.topic-t.topic),i=n.filter(e=>e.kind===`prevention-active`).sort((e,t)=>e.topic-t.topic),a=n.filter(e=>e.kind===`prevention-moderate`).sort((e,t)=>e.topic-t.topic),o=t.diabetesType.verdict===`type1-confirmed`?`T1`:t.diabetesType.verdict===`type2-confirmed`?`T2`:null,s={"EYE-CORE":`EYE`,"KIDNEY-CORE":`KIDNEY`,"NERVE-CORE":`NERVE`},c=[];for(let e of[...r,...i,...a]){c.push(e.moduleId);let t=s[e.moduleId];o&&t&&C.has(`${t}-${o}`)&&c.push(`${t}-${o}`)}let l=[`BASE-01`],u=t.diabetesType.verdict;(u===`conflicting`||u===`absent`)&&l.push(`TYPE-UNCLEAR`),l.push(...c),(c.includes(`NERVE-CORE`)||c.includes(`LEG-CIRCULATION-CORE`))&&l.push(`BASE-02`);let d=_t(t),f=wt(d,t),p=pt(d),m=ie(t,r.length,p),h=new Set;for(let e of c)for(let t of C.get(e)?.needsShared??[])h.add(t);let g=A.filter(e=>e.appliesWhen===`always`||h.has(e.appliesWhen)).map(e=>e.id),_=[];for(let e of c){let t=C.get(e)?.urgentSigns;t&&!_.includes(t)&&_.push(t)}for(let e of m.moduleIds){let t=re.get(e)?.urgentSigns;t&&!_.includes(t)&&_.push(t)}let v=[...r,...i].map(e=>e.topic),y=qt(d,t),b={},x={},S=new Set;for(let e of d){let t=Yt[e.analyte];if(!t||!c.includes(t))continue;let n=bt(e);(b[t]??=[]).push(n),(x[t]??=[]).push({text:n,messages:[...f.filter(t=>t.analyte===e.analyte&&t.patientMessage).map(e=>e.patientMessage),...y.filter(t=>t.analyte===e.analyte&&t.outOfTarget&&t.patientMessage).map(e=>e.patientMessage)]}),S.add(e.analyte)}let w={},T=new Set(d.map(e=>e.analyte));for(let[e,t]of Object.entries(an)){if(!c.includes(e))continue;let n=t.filter(e=>!T.has(e.analyte)).map(e=>e.label);n.length&&(w[e]=n)}let ee=null;if(t.medicationDateRange.known&&t.reportDate.known){let e=Date.parse(`${t.medicationDateRange.value.latest}T00:00:00Z`),n=Date.parse(`${t.reportDate.value}T00:00:00Z`);Number.isFinite(e)&&Number.isFinite(n)&&(ee=Math.round((n-e)/864e5))}return{decisions:n,topicModuleIds:c,moderateTopics:a,selfCareModuleIds:m.moduleIds,selfCareReasons:m.reasons,medicationIngredients:t.medicationIngredients,patientModuleIds:l,targets:Ut(t,r.length),audit:e,labNotes:d.filter(e=>!S.has(e.analyte)).map(bt),labNotesForClinician:d.map(xt),labPatientMessages:f.map(e=>e.patientMessage).filter(e=>!!e),labNoteEntries:d.filter(e=>!S.has(e.analyte)).map(e=>{let t=f.filter(t=>t.analyte===e.analyte&&t.patientMessage),n=y.filter(t=>t.analyte===e.analyte&&t.outOfTarget&&t.patientMessage),r=[...t.map(e=>e.patientMessage),...n.map(e=>e.patientMessage)];return{text:bt(e),messages:r,rank:t.some(e=>e.severity===`urgent`)?0:r.length?1:2}}).sort((e,t)=>e.rank-t.rank).map(({text:e,messages:t})=>({text:e,messages:t})),labThresholds:f,sharedBlockIds:g,targetComparisons:y,labByModule:b,labEntriesByModule:x,missingByModule:w,medicationLabGapDays:ee,evaluatedAnalytes:d.length,evaluatedAnalyteKeys:d.map(e=>e.analyte),unevaluatedNumericItems:t.labItems.filter(e=>e.rawValues.some(e=>/^[≧≥><＞＜]?\s*\d/.test(e.trim()))).length-d.length,followUp:le(v,{kidneyIntensive:f.some(e=>e.code===`kidney-intensive-followup`),type1:t.diabetesType.verdict===`type1-confirmed`}),urgentSigns:_}}function rn(e=!1){let t=e?[`※ 本報告的「觀察摘要」「短期建議」「中期目標」三段由模型直接撰寫，未經醫療團隊逐句核准；數值已由程式逐一比對來源，目標值取自指引門檻表。`]:[];return[`※ DRAFT｜衛教模組 ${x}／自我照護模組 ${te}／指引門檻表 ${w} 均尚未經醫療團隊核准，僅供流程比較，不得提供給病人。`,...t,``]}var an={"KIDNEY-CORE":[{analyte:`UACR`,label:`尿液白蛋白／肌酸酐比值（UACR）`},{analyte:`creatinine`,label:`血清肌酸酐`},{analyte:`eGFR`,label:`腎絲球過濾率（eGFR）`}]},on={urgent:`優先核實`,attention:`留意`,info:`參考`};function sn(e,t){e.push(`────────────────────────────────`,`【${t}】`,``)}function cn(e,t){let n=[...rn(!!t.labNarrative)];n.push(`糖尿病衛教報告`),n.push(`報告產生日期：${t.reportDate??`未提供`}`),n.push(`資料截至日期：${t.dataCutoff??`未提供`}`),n.push(``);let r=new Map(e.decisions.map(e=>[e.moduleId,e])),i=!t.labNarrative,a=(t,r=``,a=[])=>{let o=C.get(t);if(!o)return;n.push(`◆ ${o.title}${r}`,``),n.push(o.patientText,``);for(let e of a)n.push(e,``);let s=i?e.labEntriesByModule[t]:void 0;s?.length&&(n.push(`您的${o.title}相關數值：`,``),s.forEach(e=>{n.push(`・${e.text}`);for(let t of e.messages)n.push(`   ${t}`)}),n.push(``));let c=i?e.missingByModule[t]:void 0;c?.length&&n.push(`您的資料中沒有${c.join(`、`)}的紀錄。回診時可以確認是否需要安排。`,``)};for(let t of[`BASE-01`,`TYPE-UNCLEAR`])e.patientModuleIds.includes(t)&&a(t);(e.labNotes.length>0||Object.keys(e.labByModule).length>0)&&n.push(`以下提到的檢驗數值都來自健保申報紀錄。這些紀錄只有費用年月、沒有檢查日期，因此無法確認先後順序，也無法確認哪一筆最新。`,``);let o=e.patientModuleIds.filter(e=>![`BASE-01`,`TYPE-UNCLEAR`].includes(e)),s=[];for(let e of[`established`,`prevention-active`,`prevention-moderate`])for(let t of o){if(/-T[12]$/.test(t))continue;let n=r.get(t),i=n?null:o.find(e=>r.get(e)&&t.startsWith(e.split(`-`)[0]));(n?.kind??(i?r.get(i)?.kind:void 0))===e&&s.push(t)}if(t.labNarrative)sn(n,`觀察摘要：您的檢驗數值`),n.push(...Bt(t.labNarrative),``);else{let t=new Set([...e.labNoteEntries.flatMap(e=>e.messages),...Object.values(e.labEntriesByModule).flatMap(e=>e.flatMap(e=>e.messages))]),r=[...e.labPatientMessages.filter(e=>!t.has(e)),...Jt(e.targetComparisons).map(e=>e.patientMessage).filter(e=>!!e).filter(e=>!t.has(e))];if(e.labNoteEntries.length||r.length){sn(n,`觀察摘要：您的其他檢驗數值`),e.labNoteEntries.forEach(e=>{n.push(`・${e.text}`);for(let t of e.messages)n.push(`   ${t}`)}),e.labNoteEntries.length&&n.push(``);for(let e of r)n.push(e,``)}}t.labNarrative?.shortTerm&&(sn(n,`短期建議：這一兩週可以開始做的事`),n.push(t.labNarrative.shortTerm,``));let c=e.targets.targets.filter(e=>e.value&&!e.needsClinicianConfirmation);if(t.labNarrative?.midTerm||c.length||e.followUp.text){if(sn(n,`中期目標：下一階段要達到的數字`),t.labNarrative?.midTerm)n.push(t.labNarrative.midTerm,``);else if(c.length){n.push(`以下是依中華民國糖尿病學會指引、對照您的狀況推出的控制目標。實際數字仍以醫療團隊的評估為準。`,``);for(let e of c){let t=e.ruleId?D.get(e.ruleId):void 0;n.push(`◆ ${e.metric}：${t?.patientStatement??e.value}`,``)}}!t.labNarrative?.midTerm&&e.followUp.text&&(n.push(`下次檢查的建議時間：`,``),n.push(e.followUp.text,``))}if(s.length){let e=s.some(e=>{let t=r.get(e)??r.get(o.find(t=>e.startsWith(t.split(`-`)[0]))??``);return t?.kind===`prevention-active`||t?.kind===`prevention-moderate`});sn(n,`併發症風險：與您有關的健康重點`),n.push(`以下項目依您的健康紀錄挑選。若不確定自己是否有相關診斷，請回診時向醫療團隊確認。`,...e?[`其中有些來自風險評估而非診斷，列出是為了提早注意，不代表您已經有這個疾病。`]:[],``);for(let e of s)a(e,``,o.filter(t=>/-T[12]$/.test(t)&&t.split(`-`)[0]===e.split(`-`)[0]).map(e=>C.get(e)?.patientText).filter(e=>!!e))}if(e.sharedBlockIds.length||e.selfCareModuleIds.length){sn(n,`預防叮嚀：日常照護`);for(let t of e.sharedBlockIds){let e=A.find(e=>e.id===t);e&&(n.push(`◆ ${e.title}`,``),n.push(e.text,``))}let t=e.decisions.some(e=>e.kind===`established`&&(e.topic===3||e.topic===5)),r=e.medicationIngredients.join(` `),i={"kidney-or-heart":t,"sick-day-hold-drugs":/metformin|雙胍|gliflozin/i.test(r),sglt2:/gliflozin/i.test(r)};for(let t of e.selfCareModuleIds){let e=re.get(t);if(!e)continue;let r=e.patientText,a=!1;for(let t of e.definiteVariants??[])i[t.when]&&(r=r.replace(t.from,t.to),a=!0);a&&(r=ln(r)),n.push(`◆ ${e.title}`,``),n.push(r,``)}}if(e.urgentSigns.length){sn(n,`什麼情況要立刻就醫`);let t=e=>/119/.test(e)&&!/儘速就醫|當天/.test(e),r=[[`立即撥打 119`,e.urgentSigns.filter(t)],[`儘速就醫`,e.urgentSigns.filter(e=>!t(e))]];for(let[e,t]of r)t.length&&(n.push(`◆ ${e}`,``),t.forEach((e,t)=>n.push(`${t+1}. ${e}`,``)))}return n.join(`
`).trimEnd()}function ln(e){let t=0;return e.split(`
`).map(e=>/^\d+\.\s/.test(e)?e.replace(/^\d+\.\s/,`${++t}. `):e).join(`
`)}var un={"type1-confirmed":`診斷碼指向第 1 型`,"type2-confirmed":`第 2 型`,conflicting:`⚠ 第 1 型與第 2 型診斷碼並存`,absent:`資料中無糖尿病診斷碼`};function dn(e,t,n){let r=[...rn()];r.push(`【AI 醫療人員報告】`),r.push(`報告產生日期：${n.reportDate??`未提供`}`),r.push(`資料截至日期：${n.dataCutoff??`未提供`}`),r.push(`年齡：${t.ageYears.known?`${t.ageYears.value} 歲`:`未提供`}｜性別：${t.sex.known?t.sex.value:`未提供`}｜糖尿病病程：${t.diabetesDurationYears.known?`${t.diabetesDurationYears.value} 年`:`未提供`}`),r.push(``);let i=[`一`,`二`,`三`,`四`,`五`,`六`,`七`,`八`],a=0,o=e=>`${i[a++]}、${e}`;r.push(o(`併發症現況與風險預測`)),r.push(`DCSI 總分：${t.dcsiTotal.known?t.dcsiTotal.value:`來源未提供`}`);let s=new Map(t.existingComplications.map(e=>[e.code.slice(1),e])),c=new Map(t.riskPredictions.map(e=>[e.code.slice(2),e])),l=new Map(e.decisions.map(e=>[String(e.topic),e.kind])),u=Object.keys(Qt).map(Number).sort((e,t)=>e-t),d=Math.max(...u.map(e=>Qt[e].length));for(let t of u){let n=String(t),i=s.get(n),a=c.get(n),o;if(i?.present)o=`已發生（嚴重度 ${i.rawValue}）`;else if(l.get(n)===`established`){let t=e.decisions.find(e=>String(e.topic)===n);o=`${t?.provisional?`需確認`:`已發生`}（${t?.reason??`本項未輸出嚴重度`}）`}else o=a?.present&&a.value!==null?`未發生｜風險預測：${Xt[a.value]??`未定義分級`}`:`來源未提供現況與風險預測`;r.push(`  ${Qt[t].padEnd(d,`　`)}  ${o}`)}if(r.push(`  （來源對每一項只輸出其一：已發生者給嚴重度分數，未發生者給風險預測。）`),r.push(``),t.diabetesType.verdict!==`type2-confirmed`){r.push(o(`糖尿病類型`)),r.push(`  ${un[t.diabetesType.verdict]}｜${t.diabetesType.note}`);let e=[...t.diabetesType.type1IcdCodes,...t.diabetesType.type2IcdCodes];e.length&&r.push(`  相關診斷碼：${e.join(`、`)}`),r.push(``)}let f={血壓:`BP`,低密度脂蛋白膽固醇:`LDL-C`,高密度脂蛋白膽固醇:`HDL-C`,三酸甘油酯:`TG`,糖化血色素:`HbA1c`,空腹血糖:`Glucose AC`,餐後血糖:`Glucose PC`},p=e.targets.targets.filter(e=>e.value);if(p.length){r.push(`${o(`依指引推導的個別化目標`)}　來源：${ee}`);for(let e of p){let t=e.ruleId?D.get(e.ruleId):void 0;r.push(`  ${f[e.metric]??e.metric}：${t?.targetValue??e.value}${t?`　〔${k(t)}〕`:``}`)}r.push(``)}e.followUp.rules.length&&(r.push(o(`依指引的追蹤間隔`)),r.push(...pe(e.followUp.rules)),r.push(``));let m=e.audit?.disagreements??[],h=Jt(e.targetComparisons);if(e.targets.safetyFlags.length||e.labThresholds.length||h.length||m.length){r.push(o(`需核實的檢驗結果`));let t={urgent:0,attention:1,info:2},n=[];for(let e of h)n.push({severity:e.severity,text:`${e.clinicianMessage}${e.citationShort?`　〔${e.citationShort}〕`:``}`});for(let t of e.labThresholds){let e=t.ruleId?D.get(t.ruleId):void 0;n.push({severity:t.severity,text:`${t.clinicianMessage}${e?`　〔${k(e)}〕`:``}`})}let i=e.labThresholds.some(e=>e.code===`hba1c-unreliable`||e.code===`hba1c-missing`)?new Set([`hba1c-reliability`]):new Set;for(let t of e.targets.safetyFlags){if(i.has(t.code))continue;let e=t.ruleId?D.get(t.ruleId):void 0;n.push({severity:t.severity,text:`${t.message}${e?`　〔${k(e)}〕`:``}`})}n.sort((e,n)=>t[e.severity]-t[n.severity]);for(let e of n)r.push(`  [${on[e.severity]}] ${e.text}`);for(let e of m)r.push(`  [異議] ${e.topic}｜程式：${e.program_decision}`),r.push(`    LLM：${e.your_view}`);r.push(``)}let g=e.audit?.clinician_notes??[],_=e.audit?.data_concerns??[];if(g.length||_.length){r.push(o(`資料稽核（由模型提出，未經程式驗證）`));for(let e of g)r.push(`  [請確認] ${e}`);for(let e of _)r.push(`  [資料疑慮] ${e}`);r.push(``)}if(e.labNotesForClinician.length||n.labReview){if(r.push(o(`檢驗結果`)),e.labNotesForClinician.length){r.push(`  依指引門檻表逐條判定的核心指標：`);for(let t of e.labNotesForClinician)r.push(`  ${t}`)}n.labReview&&r.push(jt(n.labReview,new Set(e.evaluatedAnalyteKeys))),r.push(``)}return r.join(`
`).trimEnd()}function fn(e){let t=[`【程式已完成的主題判定（不可更改）】`];for(let n of e.decisions){let e=n.kind===`established`?n.provisional?`已納入・需確認`:`已納入・已發生`:n.kind===`prevention-active`?`已納入・積極照護`:n.kind===`prevention-moderate`?`已納入・適度介入`:`未納入`;t.push(`${n.moduleId}（R${n.topic} ${n.topicName}）：${e}｜${n.reason}`)}t.push(``,`【程式已納入的自我照護模組】`);for(let n of e.selfCareModuleIds)t.push(`${n}：${e.selfCareReasons[n]??``}`);t.push(``,`【程式推導的個別化目標】`);for(let n of e.targets.targets)t.push(`${n.metric}：${n.value??`需醫療團隊定案`}（${n.reason}）`);if(e.targets.undetermined.length){t.push(``,`【資料不足無法判定】`);for(let n of e.targets.undetermined)t.push(`- ${n}`)}return t.join(`
`)}function X(e){return{known:!0,value:e}}function Z(e){return{known:!1,reason:e}}var pn=/^(E1[0-4]2|N0[0-8]|N1[89]|N2[5-8]|Z940|Z992|Z49)/i,mn=/^E10/i,hn=/^E11/i,gn=/^E1[234]/i;function _n(e){if(e==null||e===``)return null;let t=Number(String(e).trim());return Number.isFinite(t)?t:null}function vn(e){if(e==null)return null;let t=String(e).trim().replaceAll(`/`,`-`);return/^\d{4}-\d{2}-\d{2}$/.test(t)?t:null}function yn(e,t){let n=Date.parse(`${e}T00:00:00Z`),r=Date.parse(`${t}T00:00:00Z`);return!Number.isFinite(n)||!Number.isFinite(r)?null:Math.round((r-n)/864e5)}function bn(e,t){let n=_n(e);return n===null?Z(`來源未提供 ${t} 欄位`):X(n===1)}function xn(e,t){let n=[];for(let r=1;r<=7;r+=1){let i=`${t}${r}`,a=Object.hasOwn(e,i),o=a?e[i]:null;n.push({code:i,present:a,value:a?_n(o):null,rawValue:a&&o!=null?String(o):null})}return n}function Sn(e){let t=new Set,n=new Set,r=new Set;for(let i of e){if(!W(i))continue;let e=String(i.icd_code??``).trim();e&&(mn.test(e)?t.add(e):hn.test(e)?n.add(e):gn.test(e)&&r.add(e))}let i=[...t].sort(),a=[...n].sort(),o=[...r].sort();return i.length&&a.length?{verdict:`conflicting`,type1IcdCodes:i,type2IcdCodes:a,otherDiabetesIcdCodes:o,note:`申報資料同時出現第一型與第二型糖尿病診斷碼，無法據此判定類型；不得啟用任何 T1／T2 補充模組。`}:i.length?{verdict:`type1-confirmed`,type1IcdCodes:i,type2IcdCodes:[],otherDiabetesIcdCodes:o,note:`申報資料只出現第一型糖尿病診斷碼。注意申報診斷碼是計費用途，仍應由醫療團隊確認。`}:a.length?{verdict:`type2-confirmed`,type1IcdCodes:[],type2IcdCodes:a,otherDiabetesIcdCodes:o,note:`申報資料只出現第二型糖尿病診斷碼。注意申報診斷碼是計費用途，仍應由醫療團隊確認。`}:{verdict:`absent`,type1IcdCodes:[],type2IcdCodes:[],otherDiabetesIcdCodes:o,note:`申報用藥紀錄中沒有 E10／E11 糖尿病診斷碼，無法判定類型。`}}function Cn(e,t){let n=new Map,r=[];for(let t of e){if(!W(t))continue;let e=String(t.drug_atc5_name??``).trim()||`未分類或來源未提供分類`,i=String(t.drug_ename??``).trim(),a=vn(t.drug_date);a&&r.push(a);let o=n.get(e)??{names:new Set,count:0,dates:[]};i&&o.names.add(i),o.count+=1,a&&o.dates.push(a),n.set(e,o)}let i=[...n.entries()].map(([e,n])=>{let r=[...n.dates].sort(),i=r.length?r[r.length-1]:null;return{atcClass:e,drugNames:[...n.names].sort().slice(0,8),recordCount:n.count,lastClaimDate:i,daysSinceLastClaim:i&&t?yn(i,t):null}}).sort((e,t)=>e.lastClaimDate&&t.lastClaimDate&&e.lastClaimDate!==t.lastClaimDate?t.lastClaimDate.localeCompare(e.lastClaimDate):t.recordCount-e.recordCount),a=r.sort();return{classes:i,dateRange:a.length?X({earliest:a[0],latest:a[a.length-1]}):Z(`用藥紀錄沒有可解析的日期`)}}function wn(e){return!!(/^(溶血|脂血|黃疸)$/.test(e)||/sample\s+(hemoly|haemoly)|icterus|lipemi/i.test(e)||/^comment$/i.test(e)||/^[:：]/.test(e))}function Tn(e){let t=new Map,n=!1;for(let r of e){if(!W(r))continue;(vn(r.assay_date)||vn(r.inspect_date))&&(n=!0);let e=String(r.assay_item_name??``).trim()||String(r.order_name??``).trim()||`未提供項目名稱`,i=String(r.assay_value??``).trim();if(!i||wn(e))continue;let a=`${e}｜${String(r.unit_data??``).trim()}｜${String(r.order_code??``).trim()}`,o=t.get(a)??{values:[],units:new Set,refs:new Set,months:new Set,codes:new Set},s=String(r.order_code??``).trim();s&&o.codes.add(s),o.values.push(i);let c=String(r.unit_data??``).trim();c&&c!==`null`&&o.units.add(c);let l=String(r.consult_value??``).trim();l&&l!==`null`&&o.refs.add(l);let u=String(r.fee_ym??``).trim();u&&o.months.add(u),t.set(a,o)}return{items:[...t.entries()].map(([e,t])=>({itemName:e.split(`｜`)[0],orderCodes:[...t.codes].sort(),rawValues:t.values,unit:t.units.size===1?[...t.units][0]:t.units.size>1?[...t.units].join(` / `):null,referenceRange:t.refs.size?[...t.refs][0]:null,feeMonths:[...t.months].sort(),hasDrawDates:n})).sort((e,t)=>t.rawValues.length-e.rawValues.length),hasDrawDates:n}}function En(e){let t=W(e)?e:{},n=W(t.userInput)?t.userInput:{},r=W(t.rawSources)?t.rawSources:{},i=vn(n.REPORT_DATE),a=vn(n.BIRTHDAY),o=vn(n.INDX_DATE),s=a&&i?yn(a,i):null,c=_n(n.T),l=Ke(r,`medication`),u=Ke(r,`labData`),{classes:d,dateRange:f}=Cn(l,i),{items:p,hasDrawDates:m}=Tn(u),h=[];!m&&u.length&&h.push(`檢驗紀錄只有費用年月、沒有採檢日期，因此無法建立時間順序或趨勢。任何「趨勢」「最近一次」的敘述都沒有資料支持。`),i||h.push(`來源未提供 REPORT_DATE，無法標示資料截止日。`);let g=xn(n,`R`),_=xn(n,`PR`),v=[];for(let e=1;e<=6;e+=1){let t=g.find(t=>t.code===`R${e}`),n=_.find(t=>t.code===`PR${e}`);t?.present&&n?.present&&v.push(`R${e} 與 PR${e} 同時有值`),!t?.present&&!n?.present&&v.push(`R${e} 與 PR${e} 同時缺席`)}v.length&&h.push(`下列主題不符合來源的資料模型（同一主題應只有 R 或 PR 其中一個）：${v.join(`、`)}。`);let y=Sn(l);y.verdict===`conflicting`&&h.push(y.note);let b=String((W(t.userInfo)?t.userInfo.gender:``)??``).trim().toUpperCase(),x=b===`M`||b===`男`?`男性`:b===`F`||b===`女`?`女性`:null;return{reportDate:i?X(i):Z(`來源未提供 REPORT_DATE`),dataCutoff:i?X(i):Z(`來源未提供資料截止日`),birthday:a?X(a):Z(`來源未提供 BIRTHDAY`),ageYears:s===null?Z(`缺少出生日期或報告日期，無法計算年齡`):X(Math.floor(s/365.25)),sexCode:n.SEX!==void 0&&n.SEX!==null&&n.SEX!==``?X(String(n.SEX)):Z(`來源未提供 SEX`),sex:x?X(x):Z(`userInfo.gender 未提供或無法解讀`),diabetesOnsetDate:o?X(o):Z(`來源未提供 INDX_DATE`),diabetesDurationYears:c===null?Z(`來源未提供 T`):X(Number(c.toFixed(1))),ckdIcdCodes:[...new Set(l.map(e=>W(e)?String(e.icd_code??``).trim():``).filter(e=>e&&pn.test(e.replace(/\./g,``))))].sort(),comorbidityFlags:{hypertension:bn(n.HT,`HT`),hyperlipidemia:bn(n.HL,`HL`),ckd:bn(n.CKD,`CKD`),p4p:bn(n.P4P,`P4P`)},dcsiTotal:_n(n.DCSI)===null?Z(`來源未提供 DCSI`):X(_n(n.DCSI)),grade:n.GRADE===void 0?Z(`來源未提供 GRADE`):X(String(n.GRADE)),ageGroup:n.AGEGP===void 0?Z(`來源未提供 AGEGP`):X(String(n.AGEGP)),existingComplications:g,riskPredictions:_,diabetesType:y,medicationIngredients:[...new Set(l.map(e=>W(e)?String(e.drug_ing_name??``).trim():``).filter(Boolean))].sort(),medicationClasses:d,medicationRecordCount:l.length,medicationDateRange:f,labItems:p,labRecordCount:u.length,labHasDrawDates:m,dataQualityFlags:h}}function Q(e,t){return e.known?t?t(e.value):String(e.value):`未知（${e.reason}）`}function Dn(e,t={}){let n=t.maxMedicationClasses??25,r=[];r.push(`【基本判斷依據】`),r.push(`報告日期：${Q(e.reportDate)}`),r.push(`年齡：${Q(e.ageYears,e=>`${e} 歲`)}`),r.push(`性別：${e.sex.known?e.sex.value:Q(e.sex)}`),r.push(`糖尿病病程年數：${Q(e.diabetesDurationYears,e=>`${e} 年`)}`),r.push(`DCSI 總分：${Q(e.dcsiTotal)}`),r.push(`高血壓：${Q(e.comorbidityFlags.hypertension,e=>e?`是`:`否`)}`),r.push(`高血脂：${Q(e.comorbidityFlags.hyperlipidemia,e=>e?`是`:`否`)}`),r.push(`慢性腎臟病：${Q(e.comorbidityFlags.ckd,e=>e?`是`:`否`)}`),r.push(``,`【已發生併發症現況（R）】`);for(let t of e.existingComplications)r.push(`${t.code}：${t.present?`${t.rawValue}`:`來源未出現此欄位（不得視為 0）`}`);r.push(``,`【未來風險預測（PR）】`);for(let t of e.riskPredictions)r.push(`${t.code}：${t.present?`${t.rawValue}`:`來源未出現此欄位（不得視為 0）`}`);r.push(``,`【糖尿病類型證據】`),r.push(`判定：${e.diabetesType.verdict}`),r.push(`第一型診斷碼：${e.diabetesType.type1IcdCodes.join(`、`)||`無`}`),r.push(`第二型診斷碼：${e.diabetesType.type2IcdCodes.join(`、`)||`無`}`),r.push(`說明：${e.diabetesType.note}`),r.push(``,`【用藥申報分類（非目前用藥）】`),r.push(`共 ${e.medicationRecordCount} 筆申報紀錄，涵蓋 ${e.medicationClasses.length} 個 ATC 分類。以下為最近申報的前 ${Math.min(n,e.medicationClasses.length)} 類。`);for(let t of e.medicationClasses.slice(0,n)){let e=t.lastClaimDate?`最後申報 ${t.lastClaimDate}${t.daysSinceLastClaim===null?``:`（距報告日 ${t.daysSinceLastClaim} 天）`}`:`來源無日期`;r.push(`- ${t.atcClass}｜${t.recordCount} 筆｜${e}`)}if(r.push(``,`【檢驗資料可用性】`),r.push(`共 ${e.labRecordCount} 筆；是否有採檢日：${e.labHasDrawDates?`有`:`沒有，只有費用年月`}`),r.push(``,`【R／PR 的資料模型】`),r.push(`- 同一主題只會出現 R 或 PR 其中一個。`,`- R 有值＝該併發症已發生；R 未出現＝尚未發生（該項 DCSI 分數為 0）。`,`- PR 未出現＝該主題已有 R 值、不需要預測，不得視為 PR=0。`,`- 來源只提供 PR1–PR6，沒有 PR7。`),e.dataQualityFlags.length){r.push(``,`【資料限制】`);for(let t of e.dataQualityFlags)r.push(`- ${t}`)}return r.join(`
`)}var On=new Set(`7,7.0,7.5,8,8.0,8.5,70,100,40,50,130,140,150,80,90,160,180,250,30,60,15,45,1.73,65,80,119,1925,128,1,2,3,4,5,6,7,8,9,10,0,12,24,48,2022,2024,2026`.split(`,`)),kn=[`一、觀察與提醒`,`二、短期目標`,`三、中期目標`,`四、並發症預防與照護`,`五、溫馨叮嚀`],An=[`【觀察摘要：`,`【短期建議：`,`【中期目標：`,`【併發症風險：`,`【預防叮嚀：`,`【什麼情況要立刻就醫】`],jn=/(高風險|中風險|低風險)/g,Mn=/高風險族群/,Nn=/\b(?:R[1-7]|PR[1-7]|DCSI)\b|總分|得分|[0-9０-９]\s*分(?![鐘鍾])/g,Pn=/自行(?:停藥|減藥|加藥|換藥|停用|調整劑量|增減劑量|增減藥量|更改劑量|更換藥品)/g,Fn=/[不勿禁避免切別毋]/,In=15;function Ln(e,t){let n=[],r=e.split(`
`);for(let e=0;e<r.length;e+=1){let i=t(r[e]);if(i!==null&&n.push(`第 ${e+1} 行：${i}`),n.length>=10)break}return n}function Rn(e){return[...e.matchAll(/\d+(?:\.\d+)?/g)].map(e=>e[0])}function $(e,t,n,r){return{id:e,label:t,applicable:n,passed:n?r.length===0:!0,violations:r}}function zn(e){return e.split(`
`).filter(e=>!e.trimStart().startsWith(`※ DRAFT`)).join(`
`)}function Bn(e){let{patientText:t,profile:n,positiveComplications:r=[],derivedNumbers:i=[]}=e,a=zn(e.report),o=n===`v14`,s=n===`modules`,c=[];c.push($(`no-symbol-bullets`,`沒有任何一行以 - * + • ‧ 開頭`,o||s,Ln(a,e=>{let t=e.trimStart();return/^[-*+•‧]\s/.test(t)?t.slice(0,60):null}))),c.push($(`no-markdown-emphasis`,`沒有 Markdown 粗體、標題符號或表格符號`,o||s,Ln(a,e=>/\*\*/.test(e)?`使用了 ** ：${e.trim().slice(0,60)}`:/^\s*#/.test(e)?`使用了 # 標題：${e.trim().slice(0,60)}`:/\|.*\|/.test(e)?`疑似表格：${e.trim().slice(0,60)}`:null))),c.push($(`no-risk-labels`,`沒有把高／中／低風險當成分級標籤`,o||s,Ln(a,e=>{if(!e.match(jn))return null;let t=e.replace(new RegExp(Mn.source,`g`),``);return jn.test(t)?e.trim().slice(0,60):null}))),c.push($(`no-internal-codes`,`病人可見內容沒有 R／PR／DCSI 代碼或分數`,o||s,Ln(o&&a.includes(`[AI_SECTION_SEPARATOR]`)?a.split(`[AI_SECTION_SEPARATOR]`).slice(1).join(`
`):a,e=>{let t=e.match(Nn);return t?`${t.join(`、`)}｜${e.trim().slice(0,50)}`:null}))),c.push($(`required-headings`,s?`六個段落逐字完整且順序正確`:`五大標題逐字完整且順序正確`,o||s,(()=>{let e=(s?An:kn).map(e=>({heading:e,at:a.indexOf(e)})),t=e.filter(e=>e.at===-1).map(e=>`缺少「${e.heading}」`);if(t.length)return t;let n=e.map(e=>e.at),r=[...n].sort((e,t)=>e-t);return n.every((e,t)=>e===r[t])?[]:[`段落出現順序與規定不符`]})())),c.push($(`single-separator`,`[AI_SECTION_SEPARATOR] 恰好出現一次`,o,(()=>{let e=a.split(`[AI_SECTION_SEPARATOR]`).length-1;return e===1?[]:[`出現 ${e} 次`]})())),c.push($(`pr-omitted-when-r-positive`,`已發生併發症的項目不出現在未來風險預測清單`,o&&r.length>0,r.filter(e=>RegExp(`PR${e}\\b`).test(a)).map(e=>`R${e} 大於 0，但報告中仍出現 PR${e}`))),c.push($(`iso-report-date`,`報告日期使用 YYYY-MM-DD`,o||s,[...a.matchAll(/\d{4}\s*年\s*\d{1,2}\s*月\s*\d{1,2}\s*日|\d{4}\/\d{1,2}\/\d{1,2}/g)].map(e=>e[0]).slice(0,10).map(e=>`非 ISO 日期格式：${e}`))),c.push($(`numbers-supported`,`報告中的數字都能在輸入資料或指引目標值中找到`,!0,(()=>{let e=new Set(Rn(t));for(let t of i)e.add(String(t));let n=new Set;for(let t of Rn(a))e.has(t)||On.has(t)||n.add(t);return[...n].slice(0,10).map(e=>`輸入資料中找不到的數字：${e}`)})())),c.push($(`no-self-medication-change`,`沒有建議病人自行停藥、改藥或調整劑量`,!0,Ln(a,e=>{for(let t of e.matchAll(Pn)){let n=e.slice(Math.max(0,(t.index??0)-In),t.index);if(!Fn.test(n))return`${t[0]}｜${e.trim().slice(0,60)}`}return null}))),c.push($(`evidence-sources`,`完整引用兩份來源與免責聲明`,o,(()=>{let e=[];return a.includes(`2022第2型糖尿病臨床照護指引`)||e.push(`缺少 2022 臨床照護指引來源`),a.includes(`糖尿病年鑑`)||e.push(`缺少臺灣糖尿病年鑑來源`),e})()));let l=c.filter(e=>e.applicable),u=l.filter(e=>e.passed);return{profile:n,results:c,applicableCount:l.length,passedCount:u.length,score:l.length?u.length/l.length:1}}var Vn=5*1024*1024,Hn=`gemini-3.6-flash`,Un=`__custom__`,Wn=`dmEducationGeminiTransientCredential2026`,Gn=15,Kn=[{value:`gemini-3.6-flash`,label:`Gemini 3.6 Flash｜預設・較高品質`},{value:`gemini-3.5-flash-lite`,label:`Gemini 3.5 Flash-Lite｜較快・較低成本`},{value:Un,label:`自訂模型 ID`}],qn=[{id:`selector`,label:`① 資料稽核`,role:`找資料的矛盾與需人工確認之處，結果進醫師版。改不了程式的任何判定。`,text:en},{id:`labReview`,label:`② 檢驗判讀`,role:`讀原始檢驗紀錄判斷異常，結果進醫師版。程式逐一比對它引用的每一個數值。`,text:Et},{id:`narrative`,label:`③ 檢驗敘述`,role:`寫觀察摘要、短期建議、中期目標三段。這是報告中唯一未經逐句核准的文字。`,text:Mt}],Jn={ingest:[{label:`format-patient.ts — formatPatientJson()`,text:U(z,[`formatPatientJson`],`format-patient.ts`)},{label:`patient-facts.ts — extractPatientFacts()`,text:U(B,[`extractPatientFacts`],`patient-facts.ts`)}],decide:[{label:`module-plan.ts — decideTopics()`,text:U(V,[`decideTopics`],`module-plan.ts`)},{label:`module-plan.ts — resolvePlan()`,text:U(V,[`resolvePlan`],`module-plan.ts`)}],selector:[{label:`module-plan.ts — parseDataAudit()`,text:U(V,[`parseDataAudit`],`module-plan.ts`)}],labReview:[{label:`lab-llm.ts — parseLabReview()`,text:U(Ae,[`parseLabReview`],`lab-llm.ts`)}],narrative:[{label:`lab-narrative.ts — parseLabNarrative()`,text:U(H,[`parseLabNarrative`],`lab-narrative.ts`)}],assemble:[{label:`lab-narrative.ts — formatLabNarrative()（把核實結果就地標示）`,text:U(H,[`formatLabNarrative`],`lab-narrative.ts`)},{label:`module-plan.ts — assemblePatientReport()`,text:U(V,[`assemblePatientReport`],`module-plan.ts`)},{label:`module-plan.ts — assembleClinicianReport()`,text:U(V,[`assembleClinicianReport`],`module-plan.ts`)},{label:`validate-report.ts — validateReport()`,text:U(je,[`validateReport`],`validate-report.ts`)}]},Yn=[{id:`patient`,label:`病人版衛教報告`,filename:`病人版衛教報告.txt`,note:`併發症風險與預防叮嚀逐字來自固定模組；觀察摘要、短期建議、中期目標三段由模型撰寫。`},{id:`clinician`,label:`醫師版報告`,filename:`醫師版報告.txt`,note:`由固定模組組裝，附指引章表與頁次。`},{id:`rawSelector`,label:`① 原始回應`,filename:`原始回應-資料稽核.txt`,note:`資料稽核的完整回應，未解析。它的意見改不了程式的判定，結果附在醫師版最後一節。`},{id:`rawLabReview`,label:`② 原始回應`,filename:`原始回應-檢驗判讀.txt`,note:`檢驗判讀的完整回應，未解析。報告中只採用通過數值比對的部分。`},{id:`rawNarrative`,label:`③ 原始回應`,filename:`原始回應-檢驗敘述.txt`,note:`檢驗敘述的完整回應，未解析。報告中的版本已經過數值比對與禁止事項掃描。`}],Xn=`{
  "downloadType": "DiabetesEducation",
  "userInfo": { "userId": "SAMPLE-DEMO-NOT-A-REAL-PATIENT", "gender": "F", "birthday": "1960/01/01" },
  "userInput": {
    "REPORT_DATE": "2026-08-01",
    "BIRTHDAY": "1960-01-01",
    "SEX": "1",
    "T": 8,
    "DCSI": 3,
    "CKD": 1,
    "R5": 2,
    "PR1": 2,
    "PR4": 1,
    "PR6": 0
  },
  "rawSources": {
    "medication": {
      "rObject": [
        { "drug_date": "2026-01-10", "icd_code": "E119", "icd_cname": "第2型糖尿病", "drug_atc5_name": "其他抗糖尿病藥物", "drug_ing_name": "METFORMIN HCL", "drug_fre": "BID", "day": 28 },
        { "drug_date": "2026-01-10", "icd_code": "E119", "icd_cname": "第2型糖尿病", "drug_atc5_name": "抗糖尿病藥物", "drug_ing_name": "DAPAGLIFLOZIN", "drug_fre": "QD", "day": 28 }
      ]
    },
    "labData": {
      "rObject": [
        { "fee_ym": "202601", "order_code": "09006C", "order_name": "醣化血紅素", "assay_item_name": "HbA1c", "assay_value": "9.0", "unit_data": "%", "consult_value": "[4.0][6.0]" },
        { "fee_ym": "202601", "order_code": "09005C", "order_name": "血液及體液葡萄糖-空腹", "assay_item_name": "Glu-AC", "assay_value": "200", "unit_data": "mg/dL", "consult_value": "[70][100]" },
        { "fee_ym": "202601", "order_code": "09005C", "order_name": "血液及體液葡萄糖-空腹", "assay_item_name": "Glu-AC", "assay_value": "60", "unit_data": "mg/dL", "consult_value": "[70][100]" },
        { "fee_ym": "202601", "order_code": "09015C", "order_name": "腎絲球過濾率", "assay_item_name": "eGFR", "assay_value": "45.0", "unit_data": "mL/min/1.73m2", "consult_value": "[90][]" },
        { "fee_ym": "202601", "order_code": "09011C", "order_name": "鉀", "assay_item_name": "K", "assay_value": "3.4", "unit_data": "mmol/L", "consult_value": "[3.5][5.1]" },
        { "fee_ym": "202601", "order_code": "08011C", "order_name": "血色素檢查", "assay_item_name": "Hb", "assay_value": "10.0", "unit_data": "g/dL", "consult_value": "[[≧18y]M 13.1-17.2 F 11.0-15.2][]" }
      ]
    }
  }
}`;function Zn(e,t){let n=new Blob([t],{type:`text/plain;charset=utf-8`}),r=URL.createObjectURL(n),i=document.createElement(`a`);i.href=r,i.download=e,i.click(),URL.revokeObjectURL(r)}function Qn({blockers:e}){return e.length?(0,a.jsxs)(`div`,{className:`blockerList`,role:`status`,children:[(0,a.jsx)(`strong`,{children:`目前不能執行的原因`}),(0,a.jsx)(`ul`,{children:e.map(e=>(0,a.jsxs)(`li`,{className:e.hard?`hard`:`soft`,children:[(0,a.jsx)(`span`,{className:`blockerMessage`,children:e.message}),(0,a.jsx)(`span`,{className:`blockerFix`,children:e.howToFix})]},e.code))})]}):null}function $n({input:e}){let t=e.totalTokens>we,n=Math.min(999,Math.round(e.totalTokens/we*100));return(0,a.jsxs)(`details`,{className:`compositionPanel`,children:[(0,a.jsxs)(`summary`,{children:[`三次呼叫合計送出：約 `,F(e.totalTokens),` tokens（`,F(e.totalChars),` 字）`,(0,a.jsxs)(`span`,{className:t?`limitBadge over`:`limitBadge`,children:[`模型上限的 `,n,`%`]})]}),(0,a.jsx)(`table`,{children:(0,a.jsx)(`tbody`,{children:e.parts.map(e=>(0,a.jsxs)(`tr`,{children:[(0,a.jsx)(`th`,{children:e.label}),(0,a.jsxs)(`td`,{children:[F(e.chars),` 字`]}),(0,a.jsxs)(`td`,{children:[`約 `,F(e.tokens),` tokens`,(0,a.jsx)(`em`,{children:`估算`})]})]},e.label))})}),(0,a.jsx)(`p`,{className:`fieldNote`,children:`②③ 讀的是同一份檢驗紀錄，重複的部分在這裡看得見。本工具在任何情況下都不會自動截斷病人資料。`})]})}function er(){let[e,t]=(0,r.useState)(``),[n,o]=(0,r.useState)(``),[s,c]=(0,r.useState)(`raw`),[l,u]=(0,r.useState)(``),[f,p]=(0,r.useState)(!1),[m,h]=(0,r.useState)(Hn),[g,_]=(0,r.useState)(``),[v,y]=(0,r.useState)(Gn),[b,S]=(0,r.useState)(`patient`),[C,T]=(0,r.useState)(``),[E,O]=(0,r.useState)(``),[k,ne]=(0,r.useState)({}),[re,ie]=(0,r.useState)({selector:`idle`,labReview:`idle`,narrative:`idle`}),[A,ae]=(0,r.useState)({}),[oe,se]=(0,r.useState)(``),[ce,le]=(0,r.useState)([]),[ue,de]=(0,r.useState)(`idle`),[fe,pe]=(0,r.useState)(null),[me,he]=(0,r.useState)(0),[j,ge]=(0,r.useState)(null),[_e,ve]=(0,r.useState)(``),[be,M]=(0,r.useState)(!1),[xe,Se]=(0,r.useState)(``),N=(0,r.useRef)(null),Te=(0,r.useRef)(null),Ee=m===Un?g.trim():m,De=typeof window<`u`&&window.location.hostname.endsWith(`github.io`),I=(0,r.useMemo)(()=>{let t=e.trim();if(!t.startsWith(`{`)&&!t.startsWith(`[`))return null;try{return JSON.parse(t)}catch{return null}},[e]),L=(0,r.useMemo)(()=>I?En(I):null,[I]),R=(0,r.useMemo)(()=>I?Je(I):``,[I]),Oe=(0,r.useMemo)(()=>I?Je(I,{skipIrrelevantLabs:!1}):``,[I]),z=(0,r.useMemo)(()=>L?nn(null,L):null,[L]),B=(0,r.useMemo)(()=>L?Dn(L):``,[L]),V=(0,r.useMemo)(()=>z?fn(z):``,[z]),Ae=(0,r.useMemo)(()=>B&&V?`${B}\n\n${V}`:``,[B,V]),H=(0,r.useMemo)(()=>kt(R),[R]),je=(0,r.useMemo)(()=>L&&z?Nt(R,L,{targets:z.targets.targets.filter(e=>e.value&&!e.needsClinicianConfirmation).map(e=>({metric:e.metric,value:(e.ruleId?D.get(e.ruleId)?.patientStatement:null)??e.value})),followUp:z.followUp.text}):``,[R,L,z]),Me=(0,r.useMemo)(()=>Le({selectorPrompt:en,factsText:Ae,labReviewPrompt:Et,labText:H,narrativePrompt:Mt,narrativeText:je}),[Ae,H,je]),Ne=(0,r.useMemo)(()=>Pe({rawInput:e,parsedJson:!!I,model:Ee,apiKey:l,requiresClientKey:De,totalTokens:Me.totalTokens,tokenLimit:we}),[e,I,Ee,l,De,Me.totalTokens]);(0,r.useEffect)(()=>{if(fe===null)return;let e=window.setInterval(()=>{he(Math.floor((Date.now()-fe)/1e3))},1e3);return()=>window.clearInterval(e)},[fe]),(0,r.useEffect)(()=>{j&&Te.current?.scrollIntoView({behavior:`smooth`,block:`center`})},[j]);function U(){T(``),O(``),le([]),ve(``)}function Ie(e){if(e.size>Vn){ge(K({apiMessage:`檔案 ${e.name} 超過 5 MB 上限。`}));return}let n=new FileReader;n.onload=()=>{t(String(n.result??``)),o(e.name),U(),ge(null)},n.readAsText(e,`utf-8`)}async function Re(){if(ge(null),ve(``),le([]),ne({}),ae({}),se(``),ie({selector:`running`,labReview:`running`,narrative:`running`}),Fe(Ne)||!L)return;de(`running`),pe(Date.now()),he(0);let e=new AbortController;N.current=e;let t=(t,n)=>ot({apiKey:l,model:Ee,systemPrompt:t,input:n,signal:e.signal,direct:De,timeoutMs:v*60*1e3});try{let e=await Promise.allSettled([t(en,Ae),t(Et,H),t(Mt,je)]),n=t=>e[t].status===`fulfilled`?e[t].value.text:null,r=(e,t)=>{if(!e)return null;try{return t(e)}catch{return null}};ne({rawSelector:n(0)??``,rawLabReview:n(1)??``,rawNarrative:n(2)??``});let i=r(n(0),tn),a=r(n(1),e=>At(e,L)),o=r(n(2),e=>Rt(e,L));ie({selector:e[0].status===`fulfilled`&&i?`ok`:`failed`,labReview:e[1].status===`fulfilled`&&a?`ok`:`failed`,narrative:e[2].status===`fulfilled`&&o?`ok`:`failed`}),ae({selector:{taken:i?[`需確認事項 ${i.clinician_notes.length} 則、資料疑慮 ${i.data_concerns.length} 則：全部進醫師版最後一節`,`disagreements ${i.disagreements.length} 則：僅供核對，改不了程式的判定`]:[],problems:i?i.echo&&L.dcsiTotal.known&&i.echo.dcsi!==null&&i.echo.dcsi!==L.dcsiTotal.value?[`回抄的 DCSI（${i.echo.dcsi}）與輸入不符，可能不是同一位病人`]:[]:[`回應無法解析，這一站的產出全部不採用`]},labReview:{taken:a?[`異常項目 ${a.review.abnormal.length} 則、系統性歸納 ${a.review.groups.length} 組，進醫師版`,`涵蓋來源檢驗 ${F(a.sourceRecords)} 筆`]:[],problems:a?[...a.unverifiedValues.length?[`${a.unverifiedValues.length} 個數值在來源中找不到，已在報告中就地標示`]:[],...a.unknownItems.length?[`${a.unknownItems.length} 個項目名稱來源中沒有`]:[]]:[`回應無法解析，醫師版退回程式輸出`]},narrative:{taken:o?[`敘述 ${F(P(o.narrative))} 字，放進病人版的「您的檢驗數值」`]:[],problems:o?[...o.unverifiedValues.length?[`${o.unverifiedValues.length} 個數值在來源中找不到`]:[],...o.uncitedNumbers.length?[`${o.uncitedNumbers.length} 個數字既未引用也不在門檻表：${o.uncitedNumbers.join(`、`)}`]:[],...o.bannedPhrases.length?[`踩到禁止事項：${o.bannedPhrases.join(`、`)}`]:[],...o.foundAfterAll.length?[`程式判缺檢但實際存在 ${o.foundAfterAll.length} 項，是程式的漏`]:[]]:[`回應無法解析，病人版退回固定句型`]}});let s={reportDate:new Date().toISOString().slice(0,10),dataCutoff:L.dataCutoff.known?L.dataCutoff.value:null},c=nn(i,L);T(cn(c,{...s,labNarrative:o??void 0})),O(dn(c,L,{...s,labReview:a??void 0})),S(`patient`);let l=Bn({report:cn(c,{...s,labNarrative:o??void 0}),patientText:R,profile:`modules`});se(`確定性輸出驗證：${l.passedCount}／${l.applicableCount} 項通過`+(l.passedCount===l.applicableCount?``:`（未過的列在下方）`));let u=[];for(let e of l.results)e.applicable&&!e.passed&&u.push(`輸出驗證未過｜${e.label}：${e.violations.slice(0,3).join(`；`)}`);let d=[i?null:`① 資料稽核`,a?null:`② 檢驗判讀`,o?null:`③ 檢驗敘述`].filter(Boolean);o?.foundAfterAll.length&&u.push(`敘述器在紀錄中找到程式判定為缺檢的 ${o.foundAfterAll.length} 項（${o.foundAfterAll.map(e=>`${e.item} → ${e.as}`).join(`、`)}）：項目名稱比對有漏，需修正程式。`),o?.unverifiedValues.length&&u.push(`病人版敘述引用了 ${o.unverifiedValues.length} 個來源中找不到的數值，已在報告中就地標示。`),o?.bannedPhrases.length&&u.push(`病人版敘述可能踩到禁止事項：${o.bannedPhrases.join(`、`)}。`),a?.unverifiedValues.length&&u.push(`醫師版判讀引用了 ${a.unverifiedValues.length} 個來源中找不到的數值，已在報告中就地標示。`),d.length&&u.push(`${d.join(`、`)}未取得，該部分已退回程式輸出。`),le(u);let f=c.decisions.filter(e=>e.kind!==`excluded`&&e.kind!==`prevention-moderate`).length;ve(`完成：程式依 R／PR 納入 ${f} 個併發症主題、${c.selfCareModuleIds.length} 個自我照護模組${u.length?``:`；自動檢查全數通過`}。`)}catch(e){e instanceof J?e.failure.aborted||ge(e.failure):ge(K({cause:e}))}finally{N.current===e&&(N.current=null),pe(null),de(`idle`)}}async function ze(e,t){await navigator.clipboard.writeText(e),Se(t),window.setTimeout(()=>Se(``),1500)}let Be=(0,r.useMemo)(()=>{let t=e=>e.map(e=>({...e,code:!0})),n=(e,n,r,i,a)=>{let o=qn.find(t=>t.id===e),s=k[a]??``;return{id:e,kind:`llm`,title:n,role:r,state:re[e],inputs:[{label:e===`selector`?`送出的輸入（確定性事實＋判定結果）`:`送出的輸入（檢驗紀錄）`,text:i}],recipe:[{label:`system prompt（唯讀，隨版本送審）`,text:o?.text??``},...t(Jn[e])],steps:A[e]?.taken,outputs:[{label:`原始回應（未解析）`,text:s}],problems:A[e]?.problems}};return[{id:`ingest`,kind:`program`,title:`讀取申報 JSON`,role:`把申報 JSON 拆成兩份東西：一份給模型讀的純文字（濾掉與糖尿病無關的檢驗類別），一份給程式判定用的結構化事實。數值一律照抄。`,state:R?`ok`:`idle`,inputs:[{label:`原始 JSON`,text:e}],recipe:t(Jn.ingest),steps:L?[`讀到檢驗 ${F(L.labRecordCount)} 筆、用藥 ${F(L.medicationRecordCount)} 筆`,L.labHasDrawDates?`檢驗有採檢日`:`檢驗只有費用年月、沒有採檢日，因此後面所有敘述都不得聲稱時序`,`R／PR 欄位缺 key 就記成「未提供」，不補 0`,`整理成好讀文字後再濾一次：微生物培養、藥敏、輸血配合、血液氣體、白血球分類、發炎與凝血。這些 prompt 本來就叫模型忽略，送了再叫它不要看等於付兩次錢。上面兩份可以直接對照，${Oe&&R?`濾掉 ${F(P(Oe)-P(R))} 字`:`看濾掉了什麼`}。`,`程式判定讀的是原始 JSON，不經過這道過濾——濾錯也不會影響主題、目標與門檻判定。`]:[],outputs:[{label:`① 整理成 LLM 好讀文字（全部紀錄）`,text:Oe},{label:`② 濾掉與糖尿病無關的檢驗（這份才送給 ②③）`,text:R},{label:`確定性事實（給下一站判定）`,text:B}]},{id:`decide`,kind:`program`,title:`確定性判定`,role:`依 R／PR 與指引門檻表決定主題、目標與追蹤間隔。這一站不呼叫模型，換模型不會改變結果。`,state:z?`ok`:`idle`,inputs:[{label:`確定性事實`,text:B}],recipe:t(Jn.decide),steps:z?[`逐一判定 6 個併發症主題：納入 ${z.decisions.filter(e=>e.kind!==`excluded`).length} 個`,`依併發症與年齡解出指引目標 ${z.targets.targets.filter(e=>e.value).length} 項`,`把檢驗值比對門檻表：命中 ${z.labThresholds.length} 則`,`依用藥與低血糖紀錄選出自我照護模組 ${z.selfCareModuleIds.length} 個`]:[],outputs:[{label:`主題判定結果（附每一項的理由）`,text:V}]},n(`selector`,`① 資料稽核`,`找資料的矛盾與需人工確認之處。它改不了任何程式判定，結果附在醫師版最後一節。`,Ae,`rawSelector`),n(`labReview`,`② 檢驗判讀`,`讀原始檢驗紀錄，找程式門檻沒涵蓋到的異常。結果進醫師版，每個數值都會被比對回來源。`,H,`rawLabReview`),n(`narrative`,`③ 檢驗敘述`,`寫觀察摘要、短期建議、中期目標三段。目標數字由上一站的門檻表決定，模型只負責寫成病人的話。`,je,`rawNarrative`),{id:`assemble`,kind:`program`,title:`驗證與組裝`,role:`拿前面五站的產出，把模型寫的部分逐一比對來源數值、掃描禁止事項，通過的才組進報告；沒通過的就地標示，不改寫也不刪除。`,state:C?`ok`:`idle`,inputs:[{label:`主題判定結果（第 2 站）`,text:V},{label:`① 原始回應（第 3 站）`,text:k.rawSelector??``},{label:`② 原始回應（第 4 站）`,text:k.rawLabReview??``},{label:`③ 原始回應（第 5 站）`,text:k.rawNarrative??``}],recipe:t(Jn.assemble),steps:C?[`解析三份原始回應；任何一份解析不了就整份丟棄，該段退回程式輸出`,...oe?[oe]:[],`把③敘述裡的每個數字比對回原始檢驗紀錄，對不上的標記為未核實`,`掃描禁止事項（時序宣稱、風險標籤、叫病人自行停藥等）`,`依固定模組逐字組裝兩份報告；未通過的部分就地加註警語，文字本身不改寫`,...ce.map(e=>`⚠ ${e}`)]:[],outputs:[{label:`病人版衛教報告`,text:C},{label:`醫師版報告`,text:E}]}]},[e,R,Oe,L,z,B,V,Ae,H,je,re,A,k,C,E,ce,oe]),Ve=Yn.find(e=>e.id===b)??Yn[0],W=b===`patient`?C:b===`clinician`?E:k[b]??``;return(0,a.jsxs)(`main`,{className:`workspace`,children:[(0,a.jsxs)(`header`,{className:`topbar`,children:[(0,a.jsxs)(`div`,{className:`brand`,children:[(0,a.jsx)(`span`,{className:`brandMark`,children:`糖衛`}),(0,a.jsx)(`span`,{children:`報告產生器`})]}),(0,a.jsxs)(`div`,{className:`topMeta`,children:[(0,a.jsxs)(`span`,{className:`privacyPill`,children:[(0,a.jsx)(`span`,{className:`statusDot`}),`不寫入本站資料庫`]}),(0,a.jsx)(`span`,{className:`privacyPill`,children:`金鑰僅暫存本頁`})]})]}),(0,a.jsxs)(`section`,{className:`hero`,children:[(0,a.jsxs)(`div`,{className:`heroCopy`,children:[(0,a.jsx)(`p`,{className:`eyebrow`,children:`DIABETES EDUCATION REPORT`}),(0,a.jsxs)(`h1`,{children:[`一份健保申報 JSON，`,(0,a.jsx)(`br`,{}),`兩份可用的報告。`]}),(0,a.jsx)(`p`,{className:`heroLead`,children:`併發症主題、個別化目標與追蹤間隔完全由程式依 R／PR 與指引門檻表判定；LLM 只負責規則做不到的三件事。 病人可見的衛教正文來自固定模組，不由模型改寫。`})]}),(0,a.jsx)(d,{})]}),(0,a.jsxs)(`article`,{className:`stepCard`,children:[(0,a.jsxs)(`div`,{className:`stepHeading`,children:[(0,a.jsx)(`span`,{className:`stepNumber`,children:`01`}),(0,a.jsxs)(`div`,{className:`stepHeadingText`,children:[(0,a.jsx)(`p`,{className:`eyebrow`,children:`INPUT`}),(0,a.jsx)(`h2`,{children:`病人資料`}),(0,a.jsx)(`p`,{className:`fieldNote`,children:`需要原始 JSON。這條流程要讀 R／PR／CKD 與檢驗紀錄的結構化欄位，純文字無法判定主題與門檻。`})]})]}),(0,a.jsxs)(`div`,{className:`stepBody`,children:[(0,a.jsxs)(`div`,{className:`inputGrid`,children:[(0,a.jsxs)(`div`,{className:be?`dropZone dragging`:`dropZone`,onDragOver:e=>{e.preventDefault(),M(!0)},onDragLeave:()=>M(!1),onDrop:e=>{e.preventDefault(),M(!1);let t=e.dataTransfer.files?.[0];t&&Ie(t)},children:[(0,a.jsx)(`span`,{className:`fileGlyph`,children:`JSON`}),(0,a.jsx)(`p`,{children:`拖曳檔案到這裡`}),(0,a.jsx)(`p`,{className:`fieldNote`,children:`上限 5 MB，只在瀏覽器內處理`}),(0,a.jsxs)(`label`,{className:`secondaryButton`,children:[`選擇檔案`,(0,a.jsx)(`input`,{type:`file`,accept:`.json,application/json`,hidden:!0,onChange:e=>{let t=e.target.files?.[0];t&&Ie(t),e.target.value=``}})]}),n?(0,a.jsx)(`p`,{className:`fieldNote`,children:n}):null]}),(0,a.jsxs)(`div`,{className:`editorShell`,children:[(0,a.jsxs)(`div`,{className:`editorToolbar`,children:[(0,a.jsxs)(`div`,{className:`tabs`,children:[(0,a.jsx)(`button`,{type:`button`,className:s===`raw`?`active`:``,onClick:()=>c(`raw`),children:`原始 JSON`}),(0,a.jsx)(`button`,{type:`button`,className:s===`formatted`?`active`:``,onClick:()=>c(`formatted`),disabled:!R,children:`LLM 好讀文字`})]}),(0,a.jsxs)(`span`,{className:`fieldNote`,children:[F(P(s===`raw`?e:R)),` 字`]})]}),(0,a.jsx)(`textarea`,{className:`inputEditor`,value:s===`raw`?e:R,readOnly:s===`formatted`,onChange:e=>{t(e.target.value),U()},placeholder:`在此貼上健保申報 JSON…`,spellCheck:!1}),(0,a.jsxs)(`div`,{className:`inlineActions`,children:[(0,a.jsx)(`button`,{type:`button`,className:`textButton`,onClick:()=>{t(Xn),o(``),U()},children:`載入合成示範資料`}),(0,a.jsx)(`span`,{className:`fieldNote`,children:`示範資料為虛構，非真實病人`})]})]})]}),z&&L?(0,a.jsxs)(a.Fragment,{children:[(0,a.jsxs)(`dl`,{className:`factGrid`,children:[(0,a.jsxs)(`div`,{children:[(0,a.jsx)(`dt`,{children:`已發生的併發症主題`}),(0,a.jsxs)(`dd`,{children:[z.decisions.filter(e=>e.kind===`established`).length,` 項`]})]}),(0,a.jsxs)(`div`,{children:[(0,a.jsx)(`dt`,{children:`預防重點・積極照護`}),(0,a.jsxs)(`dd`,{children:[z.decisions.filter(e=>e.kind===`prevention-active`).length,` 項`]})]}),(0,a.jsxs)(`div`,{children:[(0,a.jsx)(`dt`,{children:`預防重點・適度介入`}),(0,a.jsxs)(`dd`,{children:[z.moderateTopics.length,` 項`]})]}),(0,a.jsxs)(`div`,{children:[(0,a.jsx)(`dt`,{children:`需核實的檢驗結果`}),(0,a.jsxs)(`dd`,{children:[z.labThresholds.length,` 則`]})]}),(0,a.jsxs)(`div`,{children:[(0,a.jsx)(`dt`,{children:`自我照護模組`}),(0,a.jsxs)(`dd`,{children:[z.selfCareModuleIds.length,` 個`]})]}),(0,a.jsxs)(`div`,{children:[(0,a.jsx)(`dt`,{children:`依指引推導的目標`}),(0,a.jsxs)(`dd`,{children:[z.targets.targets.filter(e=>e.value).length,` 項`]})]})]}),(0,a.jsxs)(`details`,{className:`traceToggle`,open:!0,children:[(0,a.jsx)(`summary`,{children:`看這位病人實際跑出來的判定路徑`}),(0,a.jsx)(Ce,{plan:z,facts:L})]})]}):null]})]}),(0,a.jsxs)(`article`,{className:`stepCard generatorCard`,children:[(0,a.jsxs)(`div`,{className:`stepHeading`,children:[(0,a.jsx)(`span`,{className:`stepNumber`,children:`02`}),(0,a.jsxs)(`div`,{className:`stepHeadingText`,children:[(0,a.jsx)(`p`,{className:`eyebrow`,children:`RUN`}),(0,a.jsx)(`h2`,{children:`產出兩份報告`}),(0,a.jsx)(`p`,{className:`fieldNote`,children:`按一次並行送出三個請求。金鑰只在執行時使用，不寫入本站。`})]})]}),(0,a.jsxs)(`div`,{className:`stepBody`,children:[(0,a.jsxs)(`div`,{className:`settingsPane`,children:[(0,a.jsxs)(`div`,{className:`credentialBox`,children:[(0,a.jsxs)(`div`,{className:`credentialLabelRow`,children:[(0,a.jsx)(`label`,{className:`fieldLabel`,htmlFor:Wn,children:`Gemini 臨時存取金鑰`}),(0,a.jsx)(`span`,{className:`fieldNote`,children:`重新整理即清除`})]}),(0,a.jsxs)(`div`,{className:`passwordRow`,children:[(0,a.jsx)(`input`,{id:Wn,className:`apiKeyInput`,type:f?`text`:`password`,value:l,onChange:e=>u(e.target.value),autoComplete:`off`,spellCheck:!1,placeholder:`貼上金鑰`}),(0,a.jsx)(`button`,{type:`button`,className:`showKeyButton`,onClick:()=>p(e=>!e),children:f?`隱藏`:`顯示`})]}),(0,a.jsxs)(`p`,{className:`fieldNote`,children:[`只暫存在本頁記憶體，不寫入資料庫或瀏覽器儲存空間。`,De?`此版本由瀏覽器直接傳給 Google Gemini。`:`私人站版透過本站伺服器轉送。`,`請只在可信任的網址輸入金鑰。`]})]}),(0,a.jsxs)(`div`,{children:[(0,a.jsx)(`label`,{className:`fieldLabel`,htmlFor:`modelSelect`,children:`Gemini 模型`}),(0,a.jsx)(`select`,{id:`modelSelect`,className:`selectInput`,value:m,onChange:e=>h(e.target.value),children:Kn.map(e=>(0,a.jsx)(`option`,{value:e.value,children:e.label},e.value))}),m===Un?(0,a.jsx)(`input`,{className:`customModelInput`,value:g,onChange:e=>_(e.target.value),placeholder:`輸入 Gemini API 支援的模型 ID`}):null]}),(0,a.jsxs)(`div`,{children:[(0,a.jsx)(`label`,{className:`fieldLabel`,htmlFor:`timeoutInput`,children:`單次請求逾時上限（分鐘）`}),(0,a.jsx)(`input`,{id:`timeoutInput`,className:`textInput`,type:`number`,min:1,max:60,value:v,onChange:e=>y(Number(e.target.value)||Gn)}),(0,a.jsx)(`p`,{className:`fieldNote`,children:`逾時會明確顯示為逾時，與你按「停止」區分。`})]})]}),(0,a.jsx)($n,{input:Me}),j?(0,a.jsxs)(`div`,{className:`errorBanner`,ref:Te,role:`alert`,children:[(0,a.jsx)(`strong`,{children:j.title}),(0,a.jsx)(`p`,{children:j.advice}),j.raw?(0,a.jsx)(`pre`,{children:j.raw}):null]}):null,_e?(0,a.jsx)(`div`,{className:`noticeBanner`,children:_e}):null,ce.length?(0,a.jsxs)(`div`,{className:`blockerList`,role:`status`,children:[(0,a.jsx)(`strong`,{children:`自動檢查發現`}),(0,a.jsx)(`ul`,{children:ce.map(e=>(0,a.jsx)(`li`,{className:`soft`,children:(0,a.jsx)(`span`,{className:`blockerMessage`,children:e})},e))})]}):null,(0,a.jsx)(Qn,{blockers:Ne}),(0,a.jsxs)(`div`,{className:`cardActions`,children:[(0,a.jsx)(`button`,{type:`button`,className:`primaryButton`,onClick:Re,disabled:ue!==`idle`||Fe(Ne),children:ue===`running`?(0,a.jsxs)(a.Fragment,{children:[(0,a.jsx)(`span`,{className:`spinner`}),`三次呼叫並行中… `,me,` 秒`]}):`產出兩份報告`}),ue===`running`?(0,a.jsx)(`button`,{type:`button`,className:`stopButton`,onClick:()=>N.current?.abort(),children:`停止`}):null]})]})]}),(0,a.jsxs)(`article`,{className:`stepCard`,children:[(0,a.jsxs)(`div`,{className:`stepHeading`,children:[(0,a.jsx)(`span`,{className:`stepNumber`,children:`03`}),(0,a.jsxs)(`div`,{className:`stepHeadingText`,children:[(0,a.jsx)(`p`,{className:`eyebrow`,children:`OUTPUT`}),(0,a.jsx)(`h2`,{children:`兩份報告`}),(0,a.jsx)(`p`,{className:`fieldNote`,children:`兩份由同一份判定組出，主題、目標與門檻一致。`})]})]}),(0,a.jsxs)(`div`,{className:`stepBody`,children:[(0,a.jsxs)(`div`,{className:`outputHeader`,children:[(0,a.jsx)(`div`,{className:`tabs`,children:Yn.map(e=>(0,a.jsx)(`button`,{type:`button`,className:b===e.id?`active`:``,onClick:()=>S(e.id),children:e.label},e.id))}),(0,a.jsxs)(`div`,{className:`outputActions`,children:[(0,a.jsx)(`span`,{className:`fieldNote`,children:W?`${F(P(W))} 字`:`等待產出`}),(0,a.jsx)(`button`,{type:`button`,className:`miniButton`,onClick:()=>ze(W,b),disabled:!W,children:xe===b?`已複製`:`複製`}),(0,a.jsx)(`button`,{type:`button`,className:`miniButton`,onClick:()=>Zn(Ve.filename,W),disabled:!W,children:`下載 TXT`})]})]}),(0,a.jsx)(`p`,{className:`fieldNote`,children:Ve.note}),(0,a.jsx)(`textarea`,{className:`outputEditor`,value:W,readOnly:!0,spellCheck:!1,placeholder:b.startsWith(`raw`)?`尚未呼叫，或該次呼叫失敗。`:`尚未產出。`})]})]}),(0,a.jsxs)(`article`,{className:`stepCard`,children:[(0,a.jsxs)(`div`,{className:`stepHeading`,children:[(0,a.jsx)(`span`,{className:`stepNumber`,children:`04`}),(0,a.jsxs)(`div`,{className:`stepHeadingText`,children:[(0,a.jsx)(`p`,{className:`eyebrow`,children:`PIPELINE`}),(0,a.jsx)(`h2`,{children:`管線的每一站`}),(0,a.jsx)(`p`,{className:`fieldNote`,children:`每一站點開就看得到餵進去什麼、吐出什麼，以及程式從中採用了哪些、丟掉哪些。 system prompt 由程式定義並隨版本一起送審，不在頁面上編輯。`})]})]}),(0,a.jsx)(`div`,{className:`stepBody`,children:(0,a.jsx)(ke,{stations:Be})})]}),(0,a.jsx)(ye,{}),(0,a.jsxs)(`section`,{className:`safetyNote`,children:[(0,a.jsx)(`span`,{className:`safetyIcon`,children:`i`}),(0,a.jsxs)(`div`,{children:[(0,a.jsx)(`strong`,{children:`上線前的必要提醒`}),(0,a.jsxs)(`p`,{children:[`衛教模組 `,x,`、自我照護模組 `,te,`、指引門檻表 `,w,`（`,ee,`）均尚未經醫療團隊核准。病人版的觀察摘要、短期建議、中期目標三段由模型撰寫，數值已由程式逐一比對來源， 但文字未經逐句核准。正式提供病人前，仍應由醫療團隊核准固定內容、prompt 與模型版本，並建立人工抽查與版本紀錄。`]})]})]}),(0,a.jsxs)(`footer`,{className:`buildStamp`,children:[(0,a.jsx)(`span`,{children:`糖尿病衛教報告產生器`}),(0,a.jsx)(`span`,{children:`資料僅在本頁處理；按下產出時才送往 Gemini API。`}),(0,a.jsx)(`span`,{children:`build ${i}`})]})]})}export{er as default};