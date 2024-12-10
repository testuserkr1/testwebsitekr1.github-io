window.addEventListener("load", () => {
    const topbar = document.querySelector(".topbar");
    const topbarHeight = topbar.offsetHeight;
    document.body.style.marginTop = `${topbarHeight+20}px`;
});

const annBtn = document.getElementById("announcementBtn");
const twordBtn = document.getElementById("2rd_gradeBtn");
const onerdBtn = document.getElementById("1rd_gradeBtn");
const threerdBtn = document.getElementById("3rd_gradeBtn");

const scohoolSiteBtn = document.getElementById("school_site")

const closeBtn = document.getElementById("closeBtn");

const privacy_policy =document.getElementById("privacy_policy");

privacy_policy.onclick = function() {
    popup.style.display = "block";
}

closeBtn.onclick = function() {
    popup.style.display = "none";
}

window.onclick = function(event) {
    if (event.target == popup) {
        popup.style.display = "none";
    }
}

scohoolSiteBtn.addEventListener("click", function(){
    const website = "https://seongsa-m.goegy.kr/seongsa-m/main.do";
    window.open(website, '_blank');''
});

twordBtn.addEventListener("click", async () => {
    posts.style.display = "block";
    threerd_grade_test.style.display = "none"
    onerd_grade_test.style.display = "none"
    announcements.style.display = "none";
    info.style.display = "block";
});

annBtn.addEventListener("click", async () => {
    posts.style.display = "none";
    threerd_grade_test.style.display = "none"
    onerd_grade_test.style.display = "none"
    announcements.style.display = "block";
    info.style.display = "block";
});

onerdBtn.addEventListener("click", async () => {
    posts.style.display = "none";
    threerd_grade_test.style.display = "none"
    onerd_grade_test.style.display = "block"
    announcements.style.display = "none";
    info.style.display = "none";
});

threerdBtn.addEventListener("click", async () => {
    posts.style.display = "none";
    threerd_grade_test.style.display = "block"
    onerd_grade_test.style.display = "none"
    announcements.style.display = "none";
    info.style.display = "none";
});

