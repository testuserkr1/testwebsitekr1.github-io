import { initializeApp } from "https://www.gstatic.com/firebasejs/9.17.2/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.17.2/firebase-auth.js";
import { getFirestore, doc, getDoc, collection, addDoc, getDocs, query, orderBy } from "https://www.gstatic.com/firebasejs/9.17.2/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyCnUnvxPD5De44VNsrydhz5yLekhT7OLM0",
    authDomain: "website-88090.firebaseapp.com",
    projectId: "website-88090",
    storageBucket: "website-88090.appspot.com",
    messagingSenderId: "77153693970",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

const loginBtn = document.getElementById("login-btn");
const logoutBtn = document.getElementById("logout-btn");
const userInfoDiv = document.getElementById("user-info");
const postForm = document.getElementById("post-form");
const postContent = document.getElementById("post-content");

// XSS 방지

function escapeHtml(str) {
    return str.replace(/[&<>"']/g, (char) => {
        switch (char) {
            case '&': return '&amp;';
            case '<': return '&lt;';
            case '>': return '&gt;';
            case '"': return '&quot;';
            case "'": return '&#39;';
        }
    }).replace(/\n/g, '<br />');
}

loginBtn.addEventListener("click", async () => {
    try {
        const result = await signInWithPopup(auth, provider);
        const user = result.user;
        const userRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userRef);

        if (userDoc.exists()) {
            const userData = userDoc.data();
            if (userData.isAdmin) {
                userInfoDiv.innerHTML = `
                    <p><strong>성사중학교 시험 알리미에 오신 것을 환영합니다. 관리자 ${escapeHtml(user.displayName)}님!</strong></p>
                `;
                loginBtn.style.display = "none";
                logoutBtn.style.display = "inline-block";
                postForm.style.display = "block";
            } else {
                userInfoDiv.innerHTML = `
                    <p><strong>성사중학교 시험 알리미에 오신 것을 환영합니다. ${escapeHtml(user.displayName)}님!</strong></p>
                `;
                loginBtn.style.display = "none";
                logoutBtn.style.display = "inline-block";
                postForm.style.display = "none";
            }
        }
    } catch (error) {
        console.error("로그인 실패", error);
    }
});

logoutBtn.addEventListener("click", async () => {
    try {
        await signOut(auth);
        loginBtn.style.display = "inline-block";
        logoutBtn.style.display = "none";
        postForm.style.display = "none";
    } catch (error) {
        console.error("로그인 실패", error);
    }
});

const loadPosts = async () => {
    const postsDiv = document.getElementById("posts");
    postsDiv.innerHTML = "";
    const q = query(collection(db, "posts"), orderBy("timestamp", "desc"));
    const querySnapshot = await getDocs(q);
    querySnapshot.forEach(async (postDoc) => {
        const post = postDoc.data();
        const postDiv = document.createElement("div");
        const userRef = doc(db, "users", post.userId);
        const userDoc = await getDoc(userRef);
        let authorName = "Unknown";
        if (userDoc.exists()) {
            const userData = userDoc.data();
            authorName = userData.displayName || "Unknown";
        }
        postDiv.innerHTML = `
        <div class="post-box" style="margin-bottom: 20px;">
            <div class="post-header">
                <strong>${escapeHtml(post.title)}</strong>
            </div>
            <div class="post-content">
                ${escapeHtml(post.content)}
            </div>
            <div class="post-footer">
                <strong>Writer: ${escapeHtml(authorName)}</strong>
                <small>/ ${new Date(post.timestamp.seconds * 1000).toLocaleString()}</small>
            </div>
        </div>
        `;
        postsDiv.appendChild(postDiv);
    });
};

postForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const title = document.getElementById("post-title").value;
    const content = postContent.value;
    const user = auth.currentUser;

    if (user) {
        const userRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userRef);
        if (userDoc.exists()) {
            if (userDoc.data().isAdmin) {
                if (content && title) {
                    addPost(escapeHtml(title), escapeHtml(content), user.uid);
                    postContent.value = "";
                    document.getElementById("post-title").value = "";
                }
            } else {
                alert("관리자만 게시물을 작성할 수 있습니다.");
            }
        } else {
            alert("사용자 정보를 찾을 수 없습니다.");
        }
    }
});

const addPost = async (title, content, userId) => {
    try {
        await addDoc(collection(db, "posts"), {
            title,
            content,
            timestamp: new Date(),
            userId,
        });
        loadPosts();
    } catch (error) {
        console.error("게시물을 추가하는데 오류가 발생 했습니다.", error);
    }
};

const announcementForm = document.getElementById("announcement-form");
const announcementContent = document.getElementById("announcement-content");

announcementForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const content = announcementContent.value;
    const user = auth.currentUser;

    if (user) {
        const userRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userRef);
        if (userDoc.exists()) {
            if (userDoc.data().isAdmin) {
                if (content) {
                    addAnnouncement(escapeHtml(content), user.uid);
                    announcementContent.value = "";
                }
            } else {
                alert("관리자만 공지를 작성할 수 있습니다.");
            }
        } else {
            alert("사용자 정보를 찾을 수 없습니다.");
        }
    }
});

const addAnnouncement = async (content, userId) => {
    try {
        await addDoc(collection(db, "announcements"), {
            content,
            timestamp: new Date(),
            userId,
        });
        loadAnnouncements();
    } catch (error) {
        console.error("공지 추가 중 오류가 발생 했습니다.", error);
    }
};

const loadAnnouncements = async () => {
    const announcementsDiv = document.getElementById("announcements");
    announcementsDiv.innerHTML = "";
    const q = query(collection(db, "announcements"), orderBy("timestamp", "desc"));
    const querySnapshot = await getDocs(q);
    querySnapshot.forEach(async (announcementDoc) => {
        const announcement = announcementDoc.data();
        const announcementDiv = document.createElement("div");
        const userRef = doc(db, "users", announcement.userId);
        const userDoc = await getDoc(userRef);
        let authorName = "Unknown";
        if (userDoc.exists()) {
            const userData = userDoc.data();
            authorName = userData.displayName || "Unknown";
        }
        announcementDiv.innerHTML = `
        <div class="announcement-box" style="margin-bottom: 20px;">
            <div class="announcement-header">
                <strong>Announcement (공지)</strong>
            </div>
            <div class="announcement-content">
                ${escapeHtml(announcement.content)}
            </div>
            <div class="announcement-footer">
                <strong>Writer: ${escapeHtml(authorName)}</strong>
                <small>/ ${new Date(announcement.timestamp.seconds * 1000).toLocaleString()}</small>
            </div>
        </div>
        `;
        announcementsDiv.appendChild(announcementDiv);
    });
    Loading.style.display = "none";
};

onAuthStateChanged(auth, (user) => {
    loadPosts();
    loadAnnouncements();
    if (user) {
        postForm.style.display = "none";
        announcementForm.style.display = "none";
        const userRef = doc(db, "users", user.uid);
        getDoc(userRef).then(userDoc => {
            if (userDoc.exists() && userDoc.data().isAdmin) {
                postForm.style.display = "block";
                announcementForm.style.display = "block";
            }
        });
        loginBtn.style.display = "none";
        logoutBtn.style.display = "inline-block";
    } else {
        postForm.style.display = "none";
        announcementForm.style.display = "none";
        loginBtn.style.display = "inline-block";
        logoutBtn.style.display = "none";
    }
});
