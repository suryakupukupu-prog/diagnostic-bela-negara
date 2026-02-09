// ===============================
// STATE DASAR
// ===============================
let jawabanBenar = 0;
let jawabanSalah = 0;
let score = 0;
let nomorSoal = 0;
let levelAktif = "mudah";
let currentQuestion = null;
let soalTerpakai = [];
let quizAktif = true;
let namaPeserta = "";
let kelasPeserta = "";

const TOTAL_SOAL = 30;

// ===============================
// TIMER
// ===============================
let totalWaktu = 30 * 60;
let timerInterval = null;

// ===============================
// GOOGLE SHEET
// ===============================
const GOOGLE_SHEET_URL =
"https://script.google.com/macros/s/AKfycbybadya0UaulJF7dSkJBSAIikAZgtAMxcxabjnGM_HJt_bliZmk6VT4kC-D5ODBXH7w/exec";

// ===============================
// DIAGNOSTIC
// ===============================
let diagnostic = {
    level: {
        mudah: { benar: 0, total: 0 },
        sedang: { benar: 0, total: 0 },
        sulit: { benar: 0, total: 0 }
    },
    indikator: {}
};
// ===============================
// BOBOT INDIKATOR (OPSIONAL)
// ===============================
const bobotIndikator = {
    "PN": 1.2,   // Pengertian Negara
    "DH": 1.1,   // Dasar Hukum
    "TB": 1.3,   // Tujuan Bela Negara
    "PR": 1.0,   // Peran Warga
    "ND": 1.2,   // Nilai Dasar
    "EK": 1.0,   // Ekonomi
    "NS": 1.3,   // Nasionalisme
    "CN": 1.1    // Contoh Nyata
};

// ===============================
// LEVEL MAPPING
// ===============================
const levelSoal = {
    mudah: ["q1","q2","q3","q4","q5","q6","q7","q8","q9","q10"],
    sedang: ["q11","q12","q13","q14","q15","q16","q17","q18","q19","q20"],
    sulit: ["q21","q22","q23","q24","q25","q26","q27","q28","q29","q30"]
};

// ===============================
// INIT DIAGNOSTIC
// ===============================
function initDiagnostic() {
    for (let k in soal) {
        const ind = soal[k].indikator;
        if (!diagnostic.indikator[ind.kode]) {
            diagnostic.indikator[ind.kode] = {
                nama: ind.nama,
                benar: 0,
                total: 0,
                skor: 0,
                level: "",
                rekomendasi: ""
            };
        }
    }
}

function gambarGrafikKemampuan() {
    const canvas = document.getElementById("abilityChart");
    if (!canvas) return;

    const ctx = canvas.getContext("2d");

    const indikator = Object.values(diagnostic.indikator);
    if (indikator.length < 3) return;

    // ================= AUTO SIZE DARI WRAPPER =================
    const wrapper = canvas.parentElement;
    const size = Math.min(wrapper.clientWidth, 1000); // 🔥 AUTO BESAR
    const dpr = window.devicePixelRatio || 1;

    canvas.style.width = size + "px";
    canvas.style.height = size + "px";
    canvas.width = size * dpr;
    canvas.height = size * dpr;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size, size);

    // ================= BASIC GEOMETRY =================
    const cx = size / 2;
    const cy = size / 2;
    const radius = size * 0.38; // 🔥 PROPORSIONAL & AMAN
    const step = (Math.PI * 2) / indikator.length;

    // ================= GRID =================
    ctx.strokeStyle = "#e0e0e0";
    for (let r = 1; r <= 5; r++) {
        ctx.beginPath();
        ctx.arc(cx, cy, (radius / 5) * r, 0, Math.PI * 2);
        ctx.stroke();
    }

    // ================= AXIS + LABEL (ANTI TERPOTONG) =================
    ctx.font = "12px Inter, Arial";
    ctx.fillStyle = "#333";

    const labelOffset = size * 0.08;
    const safePadding = 24;
    const maxLabelRadius = (size / 2) - safePadding;

    indikator.forEach((ind, i) => {
        const angle = step * i - Math.PI / 2;

        // axis
        const ax = cx + Math.cos(angle) * radius;
        const ay = cy + Math.sin(angle) * radius;

        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(ax, ay);
        ctx.stroke();

        // label radius aman
        let labelRadius = radius + labelOffset;
        if (labelRadius > maxLabelRadius) {
            labelRadius = maxLabelRadius;
        }

        const x = cx + Math.cos(angle) * labelRadius;
        const y = cy + Math.sin(angle) * labelRadius;

        // align pintar
        ctx.textAlign =
            Math.cos(angle) < -0.3 ? "right" :
            Math.cos(angle) > 0.3  ? "left"  : "center";

        ctx.textBaseline =
            Math.sin(angle) < -0.3 ? "bottom" :
            Math.sin(angle) > 0.3  ? "top"    : "middle";

        ctx.fillText(ind.nama, x, y);
    });

    // ================= DATA POLYGON =================
    ctx.beginPath();
    indikator.forEach((ind, i) => {
        const value = ind.skor / 100;
        const angle = step * i - Math.PI / 2;
        const x = cx + Math.cos(angle) * value * radius;
        const y = cy + Math.sin(angle) * value * radius;
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.closePath();

    ctx.fillStyle = "rgba(33,150,243,0.35)";
    ctx.strokeStyle = "#2196f3";
    ctx.lineWidth = 2;
    ctx.fill();
    ctx.stroke();
}

// ===============================
// TIMER
// ===============================
function mulaiTimer() {
    const el = document.getElementById("time");

    
    if (!el) {
        console.warn("Elemen #time tidak ditemukan");
        return;
    }

    timerInterval = setInterval(() => {
        if (totalWaktu <= 0) {
            clearInterval(timerInterval);
            quizAktif = false;
            el.innerText = "00:00";
            disableButtons();
            alert("⏱️ Waktu habis");
            selesaiQuiz();
            return;
        }

        totalWaktu--;
        const m = Math.floor(totalWaktu / 60);
        const d = totalWaktu % 60;
        el.innerText =
            `${String(m).padStart(2,"0")}:${String(d).padStart(2,"0")}`;
    }, 1000);
}

// ===============================
// MULAI QUIZ
// ===============================
function mulaiQuiz() {
    const namaInput = document.getElementById("nama");
    const kelasInput = document.getElementById("kelas");

    if (!namaInput || !kelasInput) {
        alert("Form identitas tidak ditemukan");
        return;
    }

    namaPeserta = namaInput.value.trim();
    kelasPeserta = kelasInput.value.trim();

    if (!namaPeserta || !kelasPeserta) {
        alert("Nama & kelas wajib diisi!");
        return;
    }

    initDiagnostic();
    mulaiTimer();

    document.getElementById("start-screen").style.display = "none";
    document.getElementById("quiz-screen").style.display = "block";

    ambilSoalAdaptif();
}

// ===============================
// AMBIL SOAL ADAPTIF (AMAN)
// ===============================
function ambilSoalAdaptif() {
    if (nomorSoal >= TOTAL_SOAL) {
        selesaiQuiz();
        return;
    }

    let kandidat = levelSoal[levelAktif]
        .filter(q => !soalTerpakai.includes(q));

    if (kandidat.length === 0) {
        kandidat = Object.values(levelSoal)
            .flat()
            .filter(q => !soalTerpakai.includes(q));
    }

    if (kandidat.length === 0) {
        selesaiQuiz();
        return;
    }

    currentQuestion = kandidat[Math.floor(Math.random() * kandidat.length)];
    soalTerpakai.push(currentQuestion);

    tampilkanSoal();
}

// ===============================
// TAMPILKAN SOAL
// ===============================
function tampilkanSoal() {
    const data = soal[currentQuestion];

    document.getElementById("question-text").innerText = data.teks;

    const btn = document.querySelectorAll("#options button");
    ["A","B","C","D"].forEach((k,i)=>{
        btn[i].innerText = `${k}. ${data.opsi[k]}`;
        btn[i].disabled = false;
    });

    updateProgress();
}

// ===============================
// PROGRESS
// ===============================
function updateProgress() {
    const persen = ((nomorSoal + 1) / TOTAL_SOAL) * 100;
    document.getElementById("progress-bar").style.width = persen + "%";
    document.getElementById("progress-text").innerText =
        `Soal ${nomorSoal + 1} / ${TOTAL_SOAL}`;
}

// ===============================
// JAWAB
// ===============================
function jawab(pilihan) {
    if (!quizAktif) return;

    disableButtons();

    const data = soal[currentQuestion];
    const ind = data.indikator.kode;

    diagnostic.level[levelAktif].total++;
    diagnostic.indikator[ind].total++;

    let status = "SALAH";

    if (pilihan === data.benar) {
        score += 10;
        jawabanBenar++;
        diagnostic.level[levelAktif].benar++;
        diagnostic.indikator[ind].benar++;
        status = "BENAR";
    } else {
        jawabanSalah++;
    }

    // LOGIKA ADAPTIF LEVEL
    const lvl = diagnostic.level[levelAktif];
    if (lvl.total >= 3) {
        if (lvl.benar >= 2 && levelAktif !== "sulit") {
            levelAktif = levelAktif === "mudah" ? "sedang" : "sulit";
        } else if (lvl.benar === 0 && levelAktif !== "mudah") {
            levelAktif = levelAktif === "sulit" ? "sedang" : "mudah";
        }
        lvl.total = 0;
        lvl.benar = 0;
    }

    // kirim realtime tiap 3 soal (AMAN)
    if (nomorSoal !== 0 && nomorSoal % 3 === 0) {
    kirimRealtimeKeGoogleSheet(status);
}

    nomorSoal++;
    setTimeout(ambilSoalAdaptif, 300);
}

// ===============================
// DISABLE BUTTON
// ===============================
function disableButtons() {
    document.querySelectorAll("#options button")
        .forEach(b => b.disabled = true);
}

// ===============================
// HITUNG INDIKATOR
// ===============================
function hitungSkorIndikator() {
    for (let k in diagnostic.indikator) {
        const d = diagnostic.indikator[k];
        const raw = (d.benar / (d.total || 1)) * 100;
        const bobot = bobotIndikator[k] || 1;

        d.skor = Math.round(raw * bobot);

        if (d.skor >= 85) {
            d.level = "Sangat Menguasai";
            d.rekomendasi = "Lanjut ke materi lanjutan";
        } else if (d.skor >= 70) {
            d.level = "Menguasai";
            d.rekomendasi = "Penguatan ringan";
        } else if (d.skor >= 55) {
            d.level = "Cukup";
            d.rekomendasi = "Latihan terarah";
        } else {
            d.level = "Perlu Remedial";
            d.rekomendasi = "Pendampingan intensif";
        }
    }
}

// ===============================
// SELESAI QUIZ
// ===============================
function selesaiQuiz() {
    clearInterval(timerInterval);
    quizAktif = false;

    hitungSkorIndikator();

    let total = 0;
let totalBobot = 0;

for (let k in diagnostic.indikator) {
    const bobot = bobotIndikator[k] || 1;
    total += diagnostic.indikator[k].skor * bobot;
    totalBobot += bobot;
}

const skorAkhir = Math.round(total / (totalBobot || 1));

    document.getElementById("quiz-screen").style.display = "none";
    document.getElementById("result-screen").style.display = "block";
    document.getElementById("result-text").innerHTML = `
<strong>Skor Diagnostik Akhir:</strong> ${skorAkhir}%<br><br>
${ringkasanIndikator().replace(/\n/g,"<br>")}
`;

document.getElementById("ability-description").innerText =
narasiKemampuan(skorAkhir);
   
    setTimeout(gambarGrafikKemampuan, 100);

    kirimKeGoogleSheet(skorAkhir);
}

// ===============================
// GOOGLE SHEET
// ===============================
function kirimKeGoogleSheet(skorAkhir) {
    const payload = {
        nama: namaPeserta,
        kelas: kelasPeserta,
        skor_akhir: skorAkhir
    };

    fetch(GOOGLE_SHEET_URL, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    });
}

function kirimRealtimeKeGoogleSheet(status) {
    fetch(GOOGLE_SHEET_URL,{
        method:"POST",
        mode:"no-cors",
        headers:{ "Content-Type":"application/json"},
        body:JSON.stringify({
            soal: currentQuestion,
            status,
            level: levelAktif,
            skor: score,
            waktu: new Date().toISOString()
        })
    });
    function narasiKemampuan(skor) {
    if (skor >= 90) {
        return "🔥 Kamu nasionalis garis keras (versi sehat). Jiwa patriotikmu kuat, paham konsep, dan siap jadi contoh. Tinggal jaga konsistensi — jangan cuma semangat pas upacara.";
    } 
    if (skor >= 80) {
        return "🫡 Kamu sudah berjiwa patriotik. Paham esensi bela negara dan tahu cara menerapkannya. Sedikit penguatan konsep, kamu bisa naik level.";
    }
    if (skor >= 65) {
        return "🙂 Jiwa bela negaramu ada, tapi masih situasional. Kadang peduli, kadang cuek. Dengan latihan dan pemahaman, potensimu bisa berkembang.";
    }
    if (skor >= 50) {
        return "⚠️ Kamu belum konsisten dalam memahami bela negara. Bukan berarti anti, tapi perlu banyak refleksi dan penguatan nilai dasar.";
    }
    return "🚨 Waspada. Pemahaman bela negara masih sangat rendah. Ini saatnya belajar ulang dari konsep paling dasar — demi diri sendiri dan lingkungan.";
}
}

// ===============================
// BANK SOAL (Q1–Q30)
// ===============================
const soal = {
    // ====================
    // LEVEL MUDAH (q1–q10)
    // ====================
    q1: {
    teks: "Bela negara adalah sikap dan perilaku warga negara untuk...",
    indikator: {
        kode: "I1",
        nama: "Pengertian & Konsep Bela Negara"
    },
    opsi: {
        A: "Menentang kebijakan pemerintah",
        B: "Mempertahankan keberlangsungan hidup bangsa",
        C: "Mencari keuntungan pribadi",
        D: "Menguasai negara lain"
    },
    benar: "B",
    nextBenar: "q11",
    nextSalah: "q2"
},

    q2: {
    teks: "Dasar hukum bela negara dalam UUD 1945 terdapat pada...",
    indikator: {
        kode: "I2",
        nama: "Dasar Hukum Bela Negara"
    },
    opsi: {
        A: "Pasal 27 ayat (3)",
        B: "Pasal 30 ayat (1)",
        C: "Pasal 33 ayat (1)",
        D: "Pasal 1 ayat (3)"
    },
    benar: "A",
    nextBenar: "q11",
    nextSalah: "q3"
},

   q3: {
    teks: "Setiap warga negara berhak dan wajib ikut serta dalam usaha pembelaan negara tercantum dalam...",
    indikator: {
        kode: "I2",
        nama: "Dasar Hukum Bela Negara (UUD 1945)"
    },
    opsi: {
        A: "Pasal 27 ayat (3)",
        B: "Pasal 28",
        C: "Pasal 29",
        D: "Pasal 31"
    },
    benar: "A",
    nextBenar: "q12",
    nextSalah: "q4"
},
   q4: {
    teks: "Tujuan utama bela negara adalah...",
    indikator: {
        kode: "I3",
        nama: "Tujuan Bela Negara"
    },
    opsi: {
        A: "Mengembangkan ekonomi",
        B: "Menjaga kedaulatan negara",
        C: "Mencari kekayaan",
        D: "Menguasai negara lain"
    },
    benar: "B",
    nextBenar: "q12",
    nextSalah: "q5"
},
    q5: {
    teks: "Contoh sikap bela negara di lingkungan sekolah adalah...",
    indikator: {
        kode: "I6",
        nama: "Bela Negara di Lingkungan Sekolah"
    },
    opsi: {
        A: "Datang terlambat",
        B: "Menyontek saat ujian",
        C: "Mematuhi tata tertib sekolah",
        D: "Membolos pelajaran"
    },
    benar: "C",
    nextBenar: "q13",
    nextSalah: "q6"
},
    q6: {
    teks: "Bela negara tidak hanya dilakukan oleh...",
    indikator: {
        kode: "I12",
        nama: "Peran & Kewajiban Warga Negara"
    },
    opsi: {
        A: "Tentara",
        B: "Polisi",
        C: "Pemerintah",
        D: "Seluruh warga negara"
    },
    benar: "D",
    nextBenar: "q13",
    nextSalah: "q7"
},
    q7: {
    teks: "Salah satu nilai dasar bela negara adalah...",
    indikator: {
        kode: "I5",
        nama: "Nilai Dasar Bela Negara"
    },
    opsi: {
        A: "Individualisme",
        B: "Cinta tanah air",
        C: "Kepentingan pribadi",
        D: "Keegoisan"
    },
    benar: "B",
    nextBenar: "q14",
    nextSalah: "q8"
},
    q8: {
    teks: "Contoh bela negara di era digital adalah...",
    indikator: {
        kode: "I8",
        nama: "Bela Negara di Era Digital"
    },
    opsi: {
        A: "Menyebarkan hoaks",
        B: "Menghina simbol negara",
        C: "Bijak menggunakan media sosial",
        D: "Memprovokasi konflik"
    },
    benar: "C",
    nextBenar: "q14",
    nextSalah: "q9"
},
   q9: {
    teks: "Ikut menjaga persatuan dan kesatuan bangsa termasuk bentuk...",
    indikator: {
        kode: "I11",
        nama: "Nasionalisme & Cinta Tanah Air"
    },
    opsi: {
        A: "Bela negara",
        B: "Hak asasi",
        C: "Kepentingan kelompok",
        D: "Kewajiban pemerintah"
    },
    benar: "A",
    nextBenar: "q15",
    nextSalah: "q10"
},
    q10: {
    teks: "Ancaman terhadap negara tidak hanya bersifat militer, tetapi juga...",
    indikator: {
        kode: "I6",
        nama: "Jenis Ancaman terhadap Negara"
    },
    opsi: {
        A: "Ekonomi dan budaya",
        B: "Alam saja",
        C: "Cuaca",
        D: "Geografis"
    },
    benar: "A",
    nextBenar: "q15",
    nextSalah: "q10"
},
    // ====================
    // LEVEL SEDANG (q11–q20)
    // ====================
   q11: {
    teks: "Menghormati bendera dan lagu kebangsaan merupakan wujud...",
    indikator: {
        kode: "I11",
        nama: "Nasionalisme & Cinta Tanah Air"
    },
    opsi: {
        A: "Hak pribadi",
        B: "Cinta tanah air",
        C: "Kepentingan individu",
        D: "Kebiasaan saja"
    },
    benar: "B",
    nextBenar: "q21",
    nextSalah: "q3"
},
    q12: {
    teks: "Menjaga nama baik bangsa di luar negeri merupakan bentuk...",
    indikator: {
        kode: "I7",
        nama: "Bela Negara dalam Kehidupan Global"
    },
    opsi: {
        A: "Hak warga",
        B: "Bela negara",
        C: "Kewajiban diplomat",
        D: "Tugas TNI"
    },
    benar: "B",
    nextBenar: "q21",
    nextSalah: "q4"
},

    q13: {
    teks: "Sikap rela berkorban untuk bangsa disebut...",
    indikator: {
        kode: "I11",
        nama: "Nasionalisme & Cinta Tanah Air"
    },
    opsi: {
        A: "Nasionalisme",
        B: "Egoisme",
        C: "Individualisme",
        D: "Materialisme"
    },
    benar: "A",
    nextBenar: "q22",
    nextSalah: "q5"
},
    q14: {
    teks: "Bela negara bertujuan menjaga keutuhan...",
    indikator: {
        kode: "I3",
        nama: "Tujuan Bela Negara"
    },
    opsi: {
        A: "Individu",
        B: "Kelompok",
        C: "Bangsa dan negara",
        D: "Organisasi"
    },
    benar: "C",
    nextBenar: "q22",
    nextSalah: "q6"
},
    q15: {
    teks: "Contoh bela negara di lingkungan masyarakat adalah...",
    indikator: {
        kode: "I4",
        nama: "Contoh Bela Negara di Lingkungan Sosial"
    },
    opsi: {
        A: "Ikut ronda malam",
        B: "Merusak fasilitas umum",
        C: "Membuat keributan",
        D: "Melanggar hukum"
    },
    benar: "A",
    nextBenar: "q23",
    nextSalah: "q7"
},
    q16: {
    teks: "Bela negara bersifat...",
    indikator: {
        kode: "I8",
        nama: "Sifat Bela Negara"
    },
    opsi: {
        A: "Paksaan",
        B: "Pilihan",
        C: "Hak dan kewajiban",
        D: "Sukarela saja"
    },
    benar: "C",
    nextBenar: "q23",
    nextSalah: "q8"
},

q17: {
    teks: "Menjaga persatuan dalam keberagaman adalah wujud nilai...",
    indikator: {
        kode: "I9",
        nama: "Persatuan dan Toleransi"
    },
    opsi: {
        A: "Disintegrasi",
        B: "Toleransi",
        C: "Fanatisme",
        D: "Individualisme"
    },
    benar: "B",
    nextBenar: "q24",
    nextSalah: "q9"
},

q18: {
    teks: "Ancaman ideologi dapat dicegah dengan...",
    indikator: {
        kode: "I10",
        nama: "Pancasila & Ideologi Negara"
    },
    opsi: {
        A: "Menutup diri",
        B: "Memahami Pancasila",
        C: "Menghindari diskusi",
        D: "Mengikuti hoaks"
    },
    benar: "B",
    nextBenar: "q24",
    nextSalah: "q10"
},

q19: {
    teks: "Pancasila berfungsi sebagai...",
    indikator: {
        kode: "I1",
        nama: "Pancasila sebagai Dasar Negara"
    },
    opsi: {
        A: "Alat kekuasaan",
        B: "Dasar negara",
        C: "Peraturan daerah",
        D: "Budaya lokal"
    },
    benar: "B",
    nextBenar: "q25",
    nextSalah: "q10"
},

q20: {
    teks: "Mengikuti upacara bendera termasuk bentuk...",
    indikator: {
        kode: "I4",
        nama: "Contoh Bela Negara di Lingkungan Sosial"
    },
    opsi: {
        A: "Paksaan sekolah",
        B: "Bela negara",
        C: "Hobi",
        D: "Tradisi saja"
    },
    benar: "B",
    nextBenar: "q25",
    nextSalah: "q10"
},

    // ====================
    // LEVEL SULIT (q21–q30)
    // ====================
   q21: {
    teks: "Menjaga fasilitas umum merupakan sikap...",
    indikator: {
        kode: "I12",
        nama: "Tanggung Jawab Warga Negara"
    },
    opsi: {
        A: "Egois",
        B: "Tanggung jawab",
        C: "Individual",
        D: "Acuh tak acuh"
    },
    benar: "B",
    nextBenar: "q26",
    nextSalah: "q11"
},
    q22: {
    teks: "Ancaman non-militer contohnya adalah...",
    indikator: {
        kode: "I6",
        nama: "Jenis Ancaman terhadap Negara"
    },
    opsi: {
        A: "Invasi",
        B: "Hoaks dan narkoba",
        C: "Serangan senjata",
        D: "Perang fisik"
    },
    benar: "B",
    nextBenar: "q26",
    nextSalah: "q12"
},
    q23: {
    teks: "Menggunakan produk dalam negeri merupakan wujud...",
    indikator: {
        kode: "I13",
        nama: "Bela Negara Bidang Ekonomi"
    },
    opsi: {
        A: "Bela negara",
        B: "Gaya hidup",
        C: "Hak konsumen",
        D: "Kebiasaan"
    },
    benar: "A",
    nextBenar: "q27",
    nextSalah: "q13"
},
    q24: {
    teks: "Sikap apatis terhadap negara dapat menyebabkan...",
    indikator: {
        kode: "I14",
        nama: "Dampak Sikap Anti-Nasionalisme"
    },
    opsi: {
        A: "Persatuan",
        B: "Kemajuan",
        C: "Disintegrasi",
        D: "Kesejahteraan"
    },
    benar: "C",
    nextBenar: "q27",
    nextSalah: "q14"
},
    q25: {
    teks: "Menghargai perbedaan suku dan agama mencerminkan...",
    indikator: {
        kode: "I9",
        nama: "Persatuan dan Toleransi"
    },
    opsi: {
        A: "Diskriminasi",
        B: "Toleransi",
        C: "Fanatisme",
        D: "Radikalisme"
    },
    benar: "B",
    nextBenar: "q28",
    nextSalah: "q15"
},
   q26: {
    teks: "Peran pelajar dalam bela negara adalah...",
    indikator: {
        kode: "I15",
        nama: "Peran Warga Negara sesuai Profesi"
    },
    opsi: {
        A: "Ikut perang",
        B: "Belajar dengan sungguh-sungguh",
        C: "Menentang aturan",
        D: "Melanggar hukum"
    },
    benar: "B",
    nextBenar: "q29",
    nextSalah: "q16"
},
    q27: {
    teks: "Menjaga lingkungan termasuk bela negara karena...",
    indikator: {
        kode: "I16",
        nama: "Bela Negara & Keberlanjutan Lingkungan"
    },
    opsi: {
        A: "Lingkungan tidak penting",
        B: "Menjaga keberlangsungan bangsa",
        C: "Tugas pemerintah",
        D: "Hobi pribadi"
    },
    benar: "B",
    nextBenar: "q29",
    nextSalah: "q17"
},
    q28: {
    teks: "Sikap cinta tanah air ditunjukkan dengan...",
    indikator: {
        kode: "I11",
        nama: "Nasionalisme & Cinta Tanah Air"
    },
    opsi: {
        A: "Merusak simbol negara",
        B: "Mencela bangsa sendiri",
        C: "Bangga sebagai warga Indonesia",
        D: "Menghindari budaya lokal"
    },
    benar: "C",
    nextBenar: "q30",
    nextSalah: "q18"
},
    q29: {
    teks: "Bela negara harus dilakukan secara...",
    indikator: {
        kode: "I17",
        nama: "Strategi dan Keberlanjutan Bela Negara"
    },
    opsi: {
        A: "Terpaksa",
        B: "Terencana dan berkelanjutan",
        C: "Sementara",
        D: "Musiman"
    },
    benar: "B",
    nextBenar: "q30",
    nextSalah: "q19"
},
   q30: {
    teks: "Kesimpulan dari bela negara adalah...",
    indikator: {
        kode: "I14",
        nama: "Analisis & Kesimpulan Bela Negara"
    },
    opsi: {
        A: "Tugas TNI saja",
        B: "Kewajiban semua warga negara",
        C: "Tidak penting",
        D: "Hanya saat perang"
    },
    benar: "B",
    nextBenar: null,
    nextSalah: "q20"
}
};
