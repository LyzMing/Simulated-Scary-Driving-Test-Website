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
    }
];

// 游戏状态
let currentQuestion = 0;
let score = 0;
let isAnswered = false;

// DOM 元素
const startPage = document.getElementById('start-page');
const quizPage = document.getElementById('quiz-page');
const completePage = document.getElementById('complete-page');
const startBtn = document.getElementById('start-btn');
const restartBtn = document.getElementById('restart-btn');
const currentQuestionEl = document.getElementById('current-question');
const questionText = document.getElementById('question-text');
const questionImage = document.getElementById('question-image');
const optionsContainer = document.querySelector('.options');
const resultMessage = document.getElementById('result-message');
const swipeHint = document.getElementById('swipe-hint');
const finalScore = document.getElementById('final-score');

// 开始答题
startBtn.addEventListener('click', () => {
    startPage.classList.remove('active');
    quizPage.classList.add('active');
    currentQuestion = 0;
    score = 0;
    loadQuestion();
});

// 重新开始
restartBtn.addEventListener('click', () => {
    completePage.classList.remove('active');
    startPage.classList.add('active');
});

// 加载题目
function loadQuestion() {
    const question = questions[currentQuestion];
    currentQuestionEl.textContent = currentQuestion + 1;
    questionText.textContent = question.text;

    // 清空图片
    questionImage.innerHTML = '';

    // 加载图片（如果有）
    if (question.image) {
        const img = document.createElement('img');
        img.src = question.image;
        img.alt = '题目配图';
        questionImage.appendChild(img);
    }

    // 重置状态
    isAnswered = false;
    resultMessage.textContent = '';
    resultMessage.className = 'result-message';
    swipeHint.style.display = 'none';

    // 移除之前创建的下一题按钮
    const existingNextBtn = document.getElementById('next-btn');
    if (existingNextBtn) {
        existingNextBtn.remove();
    }

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
}

// 选择选项
function selectOption(btn, selected) {
    if (isAnswered) return;

    isAnswered = true;
    const question = questions[currentQuestion];
    const isCorrect = selected === question.answer;

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
        swipeHint.style.display = 'block';

        // 显示下一题按钮
        const nextBtn = document.createElement('button');
        nextBtn.id = 'next-btn';
        nextBtn.className = 'next-btn';
        nextBtn.textContent = '下一题 →';
        nextBtn.addEventListener('click', nextQuestion);
        swipeHint.parentNode.insertBefore(nextBtn, swipeHint);
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

// 显示完成页面
function showComplete() {
    quizPage.classList.remove('active');
    completePage.classList.add('active');
    finalScore.textContent = `你答对了 ${score} / ${questions.length} 道题`;
}

// 滑动处理（从左向右）
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
    if (!isAnswered) return;

    const diff = touchEndX - touchStartX;
    // 滑动距离超过50px且从右向左
    if (diff < -50) {
        nextQuestion();
    }
}
