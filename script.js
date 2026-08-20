// 题目数据
const questions = [
    {
        id: 0,
        text: "对于交通事故的新闻，要抱有实事求是的心态",
        options: ["A：正确", "B：错误"],
        answer: "A",
        image: null
    },
    {
        id: 1,
        text: "驾驶机动车在道路变窄的路段可以跟在任何一辆车后汇入车流。",
        options: ["A：正确", "B：错误"],
        answer: "B",
        image: null
    },
    {
        id: 2,
        text: "驾驶机动车通过十字立交桥左转弯，要在过桥前开启右转向灯进入右侧匝道。",
        options: ["A：正确", "B：错误"],
        answer: "B",
        image: null
    },
    {
        id: 3,
        text: "驾驶机动车不得超越正在超车的车辆。",
        options: ["A：正确", "B：错误"],
        answer: "A",
        image: null
    },
    {
        id: 4,
        text: "服用国家管制的精神药品，只要不影响驾驶操作，可以短途驾驶机动车。",
        options: ["A：正确", "B：错误"],
        answer: "B",
        image: null
    },
    {
        id: 5,
        text: "如图所示，D车的停放方式是正确的。",
        options: ["A：正确", "B：错误"],
        answer: "B",
        image: "配图/5图.jpg"
    },
    {
        id: 6,
        text: "驾驶人吸毒后驾车是违法行为。",
        options: ["A：正确", "B：错误"],
        answer: "A",
        image: null
    },
    {
        id: 7,
        text: "行车时务必小心孩子，是因为孩子比较小，因此不太容易被看到。",
        options: ["A：正确", "B：错误"],
        answer: "A",
        image: null
    },
    {
        id: 8,
        text: "机动车在高速行驶时，前面扬起的飞石或是遗撒物将挡风玻璃击裂，造成视线模糊不清的状况下，驾驶人要逐渐降低车速、开启危险报警闪光灯并将机动车移至不妨碍交通的地点。",
        options: ["A：正确", "B：错误"],
        answer: "A",
        image: null
    },
    {
        id: 9,
        text: "如图所示，驾驶机动车在公交车站遇到这种情况要迅速向左变更车道绕行。",
        options: ["A：正确", "B：错误"],
        answer: "B",
        image: null
    },
    {
        id: 10,
        text: "机动车在夜间行驶或者在容易发生危险的路段行驶，应当按照限速标志标明的速度行驶。",
        options: ["A：正确", "B：错误"],
        answer: "A",
        image: null
    },
    {
        id: 11,
        text: "如图所示，前方标志预告高速公路终点距离信息。",
        options: ["A：正确", "B：错误"],
        answer: "B",
        image: "配图/11图.png"
    },
    {
        id: 12,
        text: "如图，行车中遇行人在路边行走，要提前减速，谨慎驾车通过。",
        options: ["A：正确", "B：错误"],
        answer: "A",
        image: "配图/12图.png"
    },
    {
        id: 13,
        text: "夜间哪怕是绿灯且四周无车也不可快速通过，防止被车辆撞到",
        options: ["A：正确", "B：错误"],
        answer: "A",
        image: null
    },
    {
        id: 14,
        text: "夜晚遇到高速行驶的车辆应停下等其通过",
        options: ["A：正确", "B：错误"],
        answer: "A",
        image: null
    },
    {
        id: 15,
        text: "在模拟考试中，所有视角均是驾驶员的视角",
        options: ["A：正确", "B：错误"],
        answer: "B",
        image: null
    },
    // 空题（只显示题号，无选项）
    {
        id: 16,
        text: "",
        options: [],
        answer: null,
        image: null
    },
    {
        id: 17,
        text: "",
        options: [],
        answer: null,
        image: null
    },
    {
        id: 18,
        text: "",
        options: [],
        answer: null,
        image: null
    },
    {
        id: 19,
        text: "",
        options: [],
        answer: null,
        image: null
    },
    {
        id: 20,
        text: "",
        options: [],
        answer: null,
        image: null
    },
    // 选择题（4个选项）
    {
        id: 21,
        text: "驾驶机动车在这种条件的弯道处怎样转弯最安全？",
        options: ["A、减速靠右侧行驶", "B、骑轧路中心行驶", "C、靠弯道外侧行驶", "D、借对向车道行驶"],
        answer: "A",
        image: "配图/21图.jpg"
    },
    {
        id: 22,
        text: "如图所示，A车正确的做法是什么？",
        options: ["A、鸣喇叭从左侧超越自行车", "B、减速待自行车通过后再从B车左侧超越", "C、停车等待B车驶离后，在原车道行驶", "D、借用对向车道加速通过"],
        answer: "B",
        image: "配图/22图.jpg"
    },
    {
        id: 23,
        text: "驾驶机动车从高速公路加速车道汇入行车道车流时，以下做法正确的是什么?",
        options: ["A、从正常行驶车辆后驶入行车道", "B、从正常行驶车辆前驶入行车道", "C、停车等待正常行驶车辆通过", "D、加速直接驶入行车道"],
        answer: "A",
        image: null
    },
    {
        id: 24,
        text: "《禁毒法》所称的毒品，是指鸦片、海洛因、甲基苯丙胺（冰毒）、吗啡、大麻、可卡因，以及国家规定管制的其他能够使人形成瘾癖的（ ）。",
        options: ["A、精神药品", "B、麻醉药品和精神药品", "C、麻醉药品", "D、各类药物"],
        answer: "B",
        image: null
    },
    {
        id: 25,
        text: "如图所示，驾驶机动车驶离停车场进主路时，以下做法正确的是什么？",
        options: ["A、加速汇入主路车流", "B、可以不避让主路车辆", "C、无需观察,鸣喇叭示意后汇入车流", "D、减速慢行，在不妨碍主路车辆行驶的前提下汇入车流"],
        answer: "D",
        image: null
    },
    {
        id: 26,
        text: "驾驶机动车过程中，防抱死制动系统（ABS）在什么情况下可以最大限度发挥制动器效能?",
        options: ["A、间歇制动", "B、持续制动", "C、缓踏制动踏板", "D、紧急制动"],
        answer: "D",
        image: null
    },
    {
        id: 27,
        text: "在对众多吸毒者进行调查时发现，占据第一位的吸毒原因是（ ）。",
        options: ["A、借助吸毒逃离现实，寻求解脱", "B、受贩毒者引诱", "C、贪慕虚荣，赶时髦", "D、盲目好奇，追求享乐和刺激"],
        answer: "D",
        image: null
    },
    {
        id: 28,
        text: "驾驶汽车在进出隧道时应注意什么？",
        options: ["A、开启远光灯", "B、适当提高车速", "C、关闭近光灯", "D、提前降低车速"],
        answer: "D",
        image: null
    },
    {
        id: 29,
        text: "驾驶车辆驶入高速公路加速车道后，遇行车道车辆稀少时，以下做法正确的是什么？",
        options: ["A、从正常行驶车辆后驶入行车道", "B、从正常行驶车辆前驶入行车道", "C、停车等待正常行驶车辆通过", "D、加速驶入行车道"],
        answer: "A",
        image: null
    },
    {
        id: 30,
        text: "在未经许可的情况下，私自进入未开放高速路段行驶，以下做法正确的是？",
        options: ["A、立即掉头逆向驶回入口，按原路快速离开", "B、继续向前行驶，寻找最近的服务区停靠并咨询工作人员", "C、靠边停车，锁车后步行至主路寻找交警求助", "D、保持车速，从最近的收费站或应急出口驶离高速，并主动接受处理"],
        answer: "D",
        image: null
    },
    {
        id: 31,
        text: "高速公路上行车，如果因疏忽驶过出口且下一出口距离较远时怎样做？",
        options: ["A、沿路肩倒车驶回", "B、继续向前行驶", "C、立即停车", "D、在原地掉头"],
        answer: "B",
        image: null
    },
    {
        id: 32,
        text: "驾驶车辆驶入高速公路加速车道后，遇行车道车辆稀少时，以下做法正确的是什么？",
        options: ["A、从正常行驶车辆后驶入行车道", "B、从正常行驶车辆前驶入行车道", "C、停车等待正常行驶车辆通过", "D、加速驶入行车道"],
        answer: "A",
        image: null
    },
    {
        id: 33,
        text: "驾驶机动车在高速公路加速车道上行驶，可以有下列哪种行为?",
        options: ["A、倒车", "B、超车", "C、停车", "D、加速"],
        answer: "D",
        image: null
    },
    {
        id: 34,
        text: "如图所示，驾驶机动车驶入减速车道后最高时速不能超过多少？",
        options: ["A、60公里/小时", "B、50公里/小时", "C、40公里/小时", "D、30公里/小时"],
        answer: "C",
        image: "配图/34图.png"
    },
    {
        id: 35,
        text: "在同向3车道高速公路上行车，车速高于每小时90公里、低于每小时110公里的机动车不应在哪条车道上行驶？",
        options: ["A、最左侧", "B、中间", "C、最右侧", "D、任意"],
        answer: "A",
        image: null
    },
    {
        id: 36,
        text: "驾驶机动车进入高速公路隧道前需要注意什么？",
        options: ["A、开启远光灯行驶", "B、开启示宽灯、尾灯行驶", "C、开启近光灯行驶", "D、到达隧道口时鸣喇叭"],
        answer: "C",
        image: "配图/36图.png"
    },
    {
        id: 37,
        text: "在隧道内发生车辆故障时，以下做法正确的是（ ）。",
        options: ["A、能够继续行驶的，尽可能把车驶出隧道", "B、能够继续行驶的，迅速掉头驶离隧道", "C、不能继续行驶的，立即停车维修", "D、不能继续行驶的，下车将车辆推离车道"],
        answer: "A",
        image: null
    }
];

// 判断是否为空题
function isEmptyQuestion(question) {
    return !question.text && question.options.length === 0;
}

// 计算可答题总数
function getAnswerableCount() {
    return questions.filter(q => !isEmptyQuestion(q)).length;
}

// 游戏状态
let currentQuestion = 0;
let score = 0;
let isAnswered = false;
let answers = {}; // 记录每道题的答题状态
let isNightMode = false; // 夜间模式状态

// DOM 元素
const startPage = document.getElementById('start-page');
const quizPage = document.getElementById('quiz-page');
const completePage = document.getElementById('complete-page');
const startBtn = document.getElementById('start-btn');
const restartBtn = document.getElementById('restart-btn');
const prevBtn = document.getElementById('prev-btn');
const currentQuestionEl = document.getElementById('current-question');
const questionText = document.getElementById('question-text');
const questionImage = document.getElementById('question-image');
const optionsContainer = document.querySelector('.options');
const resultMessage = document.getElementById('result-message');
const finalScore = document.getElementById('final-score');
const nightModeModal = document.getElementById('night-mode-modal');
const switchNightBtn = document.getElementById('switch-night-btn');
const keepDayBtn = document.getElementById('keep-day-btn');

// 开始答题
startBtn.addEventListener('click', () => {
    startPage.classList.remove('active');
    quizPage.classList.add('active');
    currentQuestion = 0;
    score = 0;
    answers = {};
    isNightMode = false;
    document.body.classList.remove('night-mode');
    loadQuestion();
});

// 重新开始
restartBtn.addEventListener('click', () => {
    completePage.classList.remove('active');
    startPage.classList.add('active');
});

// 上一题按钮
prevBtn.addEventListener('click', prevQuestion);

// 显示夜间模式切换提示
function showNightModeModal() {
    nightModeModal.style.display = 'flex';
}

// 切换到夜间模式
switchNightBtn.addEventListener('click', () => {
    isNightMode = true;
    document.body.classList.add('night-mode');
    nightModeModal.style.display = 'none';
});

// 保持日间模式
keepDayBtn.addEventListener('click', () => {
    nightModeModal.style.display = 'none';
});

// 加载题目
function loadQuestion() {
    const question = questions[currentQuestion];
    currentQuestionEl.textContent = currentQuestion + 1;

    // 清空图片
    questionImage.innerHTML = '';

    // 加载图片（如果有）
    if (question.image) {
        const img = document.createElement('img');
        img.src = question.image;
        img.alt = '题目配图';
        img.onerror = function() {
            this.style.display = 'none';
        };
        questionImage.appendChild(img);
    }

    // 控制上一题按钮状态
    prevBtn.disabled = currentQuestion === 0;

    // 重置状态
    isAnswered = false;
    resultMessage.textContent = '';
    resultMessage.className = 'result-message';

    // 移除之前创建的下一题按钮
    const existingNextBtn = document.getElementById('next-btn');
    if (existingNextBtn) {
        existingNextBtn.remove();
    }

    // 空题处理：只显示题号，直接显示下一题按钮
    if (isEmptyQuestion(question)) {
        questionText.textContent = '';
        optionsContainer.innerHTML = '';

        // 空题直接显示下一题按钮
        const nextBtn = document.createElement('button');
        nextBtn.id = 'next-btn';
        nextBtn.className = 'next-btn';
        nextBtn.textContent = '下一题 →';
        nextBtn.addEventListener('click', nextQuestion);
        optionsContainer.appendChild(nextBtn);
        return;
    }

    // 正常题目
    questionText.textContent = question.text;

    // 生成选项按钮
    optionsContainer.innerHTML = '';
    question.options.forEach((option, index) => {
        const btn = document.createElement('button');
        btn.className = 'option-btn';
        btn.textContent = option;
        btn.dataset.option = option.charAt(0);
        btn.addEventListener('click', () => selectOption(btn, option.charAt(0)));
        optionsContainer.appendChild(btn);
    });

    // 如果已经答过这道题，显示之前的答题状态
    if (answers[currentQuestion]) {
        showPreviousAnswer();
    }

    // 如果是第0题且不是夜间模式，显示夜间模式切换提示
    if (currentQuestion === 0 && !isNightMode) {
        showNightModeModal();
    }
}

// 显示之前的答题状态
function showPreviousAnswer() {
    const answer = answers[currentQuestion];
    isAnswered = true;

    // 标记所有按钮
    const allBtns = optionsContainer.querySelectorAll('.option-btn');
    allBtns.forEach(b => {
        b.disabled = true;
        if (b.dataset.option === answer.correctAnswer) {
            b.classList.add('correct');
        }
        if (b.dataset.option === answer.selectedAnswer && !answer.isCorrect) {
            b.classList.add('wrong');
        }
    });

    if (answer.isCorrect) {
        resultMessage.textContent = '✓ 正确！';
        resultMessage.className = 'result-message correct';
    } else {
        resultMessage.textContent = '✗ 错误';
        resultMessage.className = 'result-message wrong';

        // 显示下一题按钮
        const nextBtn = document.createElement('button');
        nextBtn.id = 'next-btn';
        nextBtn.className = 'next-btn';
        nextBtn.textContent = '下一题 →';
        nextBtn.addEventListener('click', nextQuestion);
        resultMessage.parentNode.insertBefore(nextBtn, resultMessage.nextSibling);
    }
}

// 选择选项
function selectOption(btn, selected) {
    if (isAnswered) return;

    isAnswered = true;
    const question = questions[currentQuestion];
    const isCorrect = selected === question.answer;

    // 记录答题状态
    answers[currentQuestion] = {
        selectedAnswer: selected,
        correctAnswer: question.answer,
        isCorrect: isCorrect
    };

    // 标记所有按钮
    const allBtns = optionsContainer.querySelectorAll('.option-btn');
    allBtns.forEach(b => {
        b.disabled = true;
        if (b.dataset.option === question.answer) {
            b.classList.add('correct');
        }
        if (b.dataset.option === selected && !isCorrect) {
            b.classList.add('wrong');
        }
    });

    if (isCorrect) {
        score++;
        resultMessage.textContent = '✓ 正确！';
        resultMessage.className = 'result-message correct';

        // 答对自动进入下一题
        setTimeout(() => {
            nextQuestion();
        }, 1000);
    } else {
        resultMessage.textContent = '✗ 错误';
        resultMessage.className = 'result-message wrong';

        // 显示下一题按钮
        const nextBtn = document.createElement('button');
        nextBtn.id = 'next-btn';
        nextBtn.className = 'next-btn';
        nextBtn.textContent = '下一题 →';
        nextBtn.addEventListener('click', nextQuestion);
        resultMessage.parentNode.insertBefore(nextBtn, resultMessage.nextSibling);
    }
}

// 下一题
function nextQuestion() {
    currentQuestion++;
    if (currentQuestion >= questions.length) {
        showComplete();
    } else {
        loadQuestion();
    }
}

// 上一题
function prevQuestion() {
    if (currentQuestion > 0) {
        currentQuestion--;
        loadQuestion();
    }
}

// 显示完成页面
function showComplete() {
    quizPage.classList.remove('active');
    completePage.classList.add('active');
    finalScore.textContent = `你答对了 ${score} / ${getAnswerableCount()} 道题`;
}

// 滑动处理
let touchStartX = 0;
let touchEndX = 0;

quizPage.addEventListener('touchstart', (e) => {
    touchStartX = e.changedTouches[0].screenX;
});

quizPage.addEventListener('touchend', (e) => {
    touchEndX = e.changedTouches[0].screenX;
    handleSwipe();
});

// 鼠标滑动支持（PC端）
quizPage.addEventListener('mousedown', (e) => {
    touchStartX = e.screenX;
});

quizPage.addEventListener('mouseup', (e) => {
    touchEndX = e.screenX;
    handleSwipe();
});

function handleSwipe() {
    const diff = touchEndX - touchStartX;
    // 滑动距离超过50px
    if (Math.abs(diff) > 50) {
        if (diff < 0) {
            // 从右向左滑动 → 下一题（空题或答过题才能下一题）
            if (isAnswered || isEmptyQuestion(questions[currentQuestion])) {
                nextQuestion();
            }
        } else {
            // 从左向右滑动 → 上一题（任何时候都可以）
            prevQuestion();
        }
    }
}
