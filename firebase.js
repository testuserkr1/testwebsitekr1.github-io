import { initializeApp } from "https://www.gstatic.com/firebasejs/9.17.2/firebase-app.js";
import { getAuth, signInWithPopup, signInWithRedirect, GoogleAuthProvider, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.17.2/firebase-auth.js";
import { where, getFirestore, doc, getDoc, collection, addDoc, getDocs, query, orderBy, setDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/9.17.2/firebase-firestore.js";


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

function escapeHtml(str) {
    const allowedTags = ['br'];
    return str.replace(/</g, '&lt;')
              .replace(/>/g, '&gt;')
              .replace(/&lt;(\/?)(\w+)&gt;/g, (match, slash, tagName) => {
                  return allowedTags.includes(tagName) ? `<${slash}${tagName}>` : match;
              })
              .replace(/\n/g, '<br>');
}

loginBtn.addEventListener("click", async () => {
    try {
        const result = await signInWithPopup(auth, provider);
        const user = result.user;

        const userRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userRef);

        if (!userDoc.exists()) {
            await setDoc(userRef, {
                displayName: user.displayName || "기본 이름",
                email: user.email,
                isAdmin: false,
            });
        }

        const userDocData = await getDoc(userRef);

        if (userDocData.exists()) {
            const userData = userDocData.data();
            if (userData.isAdmin) {
                userInfoDiv.innerHTML = `
                    <p><strong>성사중학교 시험 알리미에 오신 것을 환영합니다. 관리자 ${escapeHtml(user.displayName)}님!</strong></p>
                `;
                loginBtn.style.display = "none";
                logoutBtn.style.display = "inline-block";
                postForm.style.display = "block";
                loadPosts();
                loadAnnouncements();
            } else {
                userInfoDiv.innerHTML = `
                    <p><strong>성사중학교 시험 알리미에 오신 것을 환영합니다. ${escapeHtml(user.displayName)}님!</strong></p>
                `;
                loginBtn.style.display = "none";
                logoutBtn.style.display = "inline-block";
                postForm.style.display = "none";
                loadPosts();
                loadAnnouncements();
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

        try {
            const userDoc = await getDoc(userRef);
            let authorName = "Unknown";
            
            if (userDoc.exists()) {
                const userData = userDoc.data();
                authorName = userData.displayName || "Unknown";
            }

            postDiv.innerHTML = `
                <div class="post-box" style="margin-bottom: 20px; text-align: left;" data-post-id="${postDoc.id}">
                    <div class="post-header">
                        <strong>${escapeHtml(post.title)}</strong>
                    </div>
                    <div class="post-content">
                        <div class="post-box-content">
                            ${escapeHtml(post.content)}
                        </div>
                    </div> 
                    <div class="post-footer">
                        <strong>Writer: ${escapeHtml(authorName)}</strong>
                        <small>/ ${new Date(post.timestamp.seconds * 1000).toLocaleString()}</small>
                    </div>
                    <form class="comments-form" data-post-id="${postDoc.id}" style="display: flex; align-items: center;">
                        <textarea class="comments-content" placeholder="댓글을 입력하세요" required style="flex: 1; margin-right: 10px;"></textarea>
                        <button type="submit">댓글 올리기</button>
                    </form>
                    <div id="comments-${escapeHtml(postDoc.id)}" class="post-comments"></div>
                </div>
            `;
            postsDiv.appendChild(postDiv);
            loadComments(postDoc.id);
        } catch (error) {
            console.error("유저 정보를 가져오는 중 오류 발생:", error);
        }
    });
};



const deleteComment = async (postId, commentId, commentUserId) => {
    const auth = getAuth();
    const currentUser = auth.currentUser;
    
    if (!currentUser) {
        alert("로그인이 필요합니다.");
        return;
    }

    const userRef = doc(db, "users", currentUser.uid);
    const userDoc = await getDoc(userRef);
    
    if (currentUser.uid !== commentUserId) {
        if (userDoc.exists() && userDoc.data().isAdmin) {
            await deleteDoc(doc(db, "comments", commentId));
            const repliesRef = collection(db, "replies");
            const q = query(repliesRef, where("commentId", "==", commentId));
            
            const querySnapshot = await getDocs(q);
            for (const docSnapshot of querySnapshot.docs) {
                const docRef = doc(db, "replies", docSnapshot.id);
                await deleteDoc(docRef);
            }
            loadComments(postId);
        } else {
            alert("본인이 작성한 댓글만 삭제할 수 있습니다.");
            return;
        }
    } else {
        await deleteDoc(doc(db, "comments", commentId));
        const repliesRef = collection(db, "replies");
        const q = query(repliesRef, where("commentId", "==", commentId));
        
        const querySnapshot = await getDocs(q);
        for (const docSnapshot of querySnapshot.docs) {
            const docRef = doc(db, "replies", docSnapshot.id);
            await deleteDoc(docRef);
        }
        loadComments(postId);
    }
};


document.addEventListener("click", async (e) => {
    if (e.target.classList.contains("delete-comment-btn")) {
        const commentId = e.target.dataset.commentId;
        const commentUserId = e.target.dataset.commentUserId;

        if (!commentId || !commentUserId) {
            console.error("댓글 ID 또는 작성자 ID를 찾을 수 없습니다.");
            return;
        }

        const postElement = e.target.closest(".post-box, .qna-box");
        const postId = postElement?.dataset.postId;

        if (!postId) {
            console.error("PostId를 찾을 수 없습니다.");
            return;
        }

        if (confirm("정말로 이 댓글을 삭제하시겠습니까?")) {
            try {
                await deleteComment(postId, commentId, commentUserId);
                alert("댓글이 성공적으로 삭제되었습니다.");
            } catch (error) {
                console.error("댓글 삭제 중 오류 발생:", error);
                alert("댓글 삭제에 실패했습니다.");
            }
        }
    }
});


const addComment = async (postId, content, userId) => {
    const formattedContent = escapeHtml("<br>"+content);

    if (content.length > 500) {
        alert("댓글은 500자 이하로 작성해 주세요.");
        return;
    }

    await addDoc(collection(db, "comments"), {
        postId,
        content: formattedContent,
        timestamp: new Date(),
        userId,
    });
    loadComments(postId);
};

document.addEventListener("submit", async (e) => {
    if (e.target.classList.contains("comments-form")) {
        e.preventDefault();
        const postId = e.target.dataset.postId;
        const content = e.target.querySelector(".comments-content").value;
        const user = getAuth().currentUser;

        if (user && content) {
            addComment(postId, escapeHtml(content), user.uid);
            e.target.querySelector(".comments-content").value = "";
        } else {
            alert("로그인 후 댓글을 작성할 수 있습니다.");
        }
    }
});

const addReply = async (commentId, content, userId) => {
    const formattedContent = escapeHtml(content);

    if (content.length > 500) {
        alert("답글은 500자 이하로 작성해 주세요.");
        return;
    }

    await addDoc(collection(db, "replies"), {
        commentId,
        content: formattedContent,
        timestamp: new Date(),
        userId,
    });
    loadReplies(commentId);
};

document.addEventListener("click", async (e) => {
    if (e.target.classList.contains("delete-reply-btn")) {
        const commentId = e.target.dataset.commentId;
        const commentUserId = e.target.dataset.commentUserId;

        if (!commentId || !commentUserId) {
            return;
        }

        const postElement = e.target.closest(".post-box, .qna-box");
        const postId = postElement?.dataset.postId;

        if (!postId) {
            return;
        }

        if (confirm("정말로 이 답글을 삭제하시겠습니까?")) {
            try {
                await deleteReply(postId, commentId, commentUserId);
                alert("답글이 성공적으로 삭제되었습니다.");
            } catch (error) {
                console.error("답글 삭제 중 오류 발생:", error);
                alert("답글 삭제에 실패했습니다.");
            }
        }
    }
});

const deleteReply = async (postId, commentId, commentUserId) => {
    const auth = getAuth();
    const currentUser = auth.currentUser;
    const user = auth.currentUser;

    if (!currentUser) {
        alert("로그인이 필요합니다.");
        return;
    }
    const userRef = doc(db, "users", user.uid);
    const userDoc = await getDoc(userRef);
    if (currentUser.uid !== commentUserId) {
        if (userDoc.data().isAdmin) {
            await deleteDoc(doc(db, "replies", commentId));
            loadComments(postId);
        } else {
            alert("본인이 작성한 답글만 삭제할 수 있습니다.");
            return;
        }
    }

    await deleteDoc(doc(db, "replies", commentId));
    loadComments(postId);
};

document.addEventListener("click", async (e) => {
    if (e.target.classList.contains("delete-reply-btn")) {
        const commentId = e.target.dataset.replyId;
        const commentUserId = e.target.dataset.replyUserId;

        if (!commentId || !commentUserId) {
            console.error("댓글 ID 또는 작성자 ID를 찾을 수 없습니다.");
            return;
        }

        const postElement = e.target.closest(".post-box, .qna-box");
        const postId = postElement?.dataset.postId;

        if (!postId) {
            console.error("PostId를 찾을 수 없습니다.");
            return;
        }

        if (confirm("정말로 이 댓글을 삭제하시겠습니까?")) {
            try {
                await deleteReply(postId, commentId, commentUserId);
                alert("댓글이 성공적으로 삭제되었습니다.");
            } catch (error) {
                console.error("댓글 삭제 중 오류 발생:", error);
                alert("댓글 삭제에 실패했습니다.");
            }
        }
    }
});

const loadReplies = async (commentId) => {
    const repliesDiv = document.getElementById(`replies-${commentId}`);
    if (!repliesDiv) {
        return;
    }

    repliesDiv.innerHTML = "";
    const q = query(
        collection(db, "replies"),
        where("commentId", "==", commentId),
        orderBy("timestamp", "desc")
    );

    const querySnapshot = await getDocs(q);

    querySnapshot.forEach(async (replyDoc) => {
        const reply = replyDoc.data();
        const replyId = replyDoc.id;

        const userRef = doc(db, "users", reply.userId);
        const userDoc = await getDoc(userRef);
        let authorName = "Unknown";

        if (userDoc.exists()) {
            const userData = userDoc.data();
            authorName = userData.displayName || "Unknown";
        }

        const replyDiv = document.createElement("div");
        replyDiv.classList.add("reply");
        replyDiv.innerHTML = `
            <p style="margin-left: 30px;"><strong>${escapeHtml(authorName)}:</strong> ${escapeHtml(reply.content)}</p>
            <small style="margin-left: 30px;">${new Date(reply.timestamp.seconds * 1000).toLocaleString()}</small>
            <button class="delete-reply-btn" 
                    data-reply-id="${replyId}" 
                    data-reply-user-id="${reply.userId}" 
                    data-comment-id="${commentId}">
                삭제
            </button>
        `;
        repliesDiv.appendChild(replyDiv);
    });
};

const loadComments = async (postId) => {
    const commentsDiv = document.getElementById(`comments-${postId}`);
    if (!commentsDiv) {
        return;
    }

    commentsDiv.innerHTML = "";
    const q = query(
        collection(db, "comments"),
        where("postId", "==", postId),
        orderBy("timestamp", "desc")
    );

    const querySnapshot = await getDocs(q);

    querySnapshot.forEach(async (commentDoc) => {
        const comment = commentDoc.data();
        const commentId = commentDoc.id;
        const userRef = doc(db, "users", comment.userId);
        const userDoc = await getDoc(userRef);
        let authorName = "Unknown";
        if (userDoc.exists()) {
            const userData = userDoc.data();
            authorName = userData.displayName || "Unknown";
        }

        const commentDiv = document.createElement("div");
        commentDiv.classList.add("comment");
        commentDiv.innerHTML = `
            <p><strong>${escapeHtml(authorName)}:</strong> ${escapeHtml(comment.content)}</p>
            <small>${new Date(comment.timestamp.seconds * 1000).toLocaleString()}</small>
            <button class="delete-comment-btn" 
                    data-comment-id="${commentId}" 
                    data-comment-user-id="${comment.userId}" 
                    data-post-id="${postId}">
                삭제
            </button>
            <button class="reply-btn" data-comment-id="${commentId}">답글</button>
            <div id="replies-${commentId}" class="replies"></div>
            <form class="reply-form" data-comment-id="${commentId}" style="display:none;">
                <input type="text" class="reply-content" placeholder="답글을 입력하세요." maxlength="500" />
                <button type="submit">답글 추가</button>
            </form>
        `;
        commentsDiv.appendChild(commentDiv);
        loadReplies(commentId);
    });
};

document.addEventListener("click", (e) => {
    if (e.target.classList.contains("reply-btn")) {
        const commentId = e.target.dataset.commentId;
        const replyForm = document.querySelector(`.reply-form[data-comment-id="${commentId}"]`);
        replyForm.style.display = replyForm.style.display === "none" ? "block" : "none";
    }
});

document.addEventListener("submit", async (e) => {
    if (e.target.classList.contains("reply-form")) {
        e.preventDefault();
        const commentId = e.target.dataset.commentId;
        const content = e.target.querySelector(".reply-content").value;
        const user = getAuth().currentUser;

        if (user && content) {
            await addReply(commentId, content, user.uid);
            e.target.querySelector(".reply-content").value = "";
        } else {
            alert("로그인 후 답글을 작성할 수 있습니다.");
        }
    }
});

postForm.addEventListener("submit", async (e) => {
    const displayValue = window.getComputedStyle(posts).display;
    if (displayValue == "block") {
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
    } else {
        alert("지정한 페이지에서만 게시물을 추가 할 수 있습니다.")
        return;
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
    const displayValue = window.getComputedStyle(announcements).display;
    if (displayValue == "block") {
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
    } else {
        alert("지정한 페이지에서만 게시물을 추가 할 수 있습니다.")
        return;
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

const qnaForm = document.getElementById("qna-form");
const qnaContent = document.getElementById("qna-content");
const qna = document.getElementById("qna");

qnaForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const displayValue = window.getComputedStyle(qna).display;
    if (displayValue === "block") {
        const content = qnaContent.value.trim();
        const title = document.getElementById("qna-title").value;
        const user = auth.currentUser;

        if (user) {
            const userRef = doc(db, "users", user.uid);
            const userDoc = await getDoc(userRef);

            if (userDoc.exists() && content) {
                await addqna(escapeHtml(title) ,escapeHtml(content), user.uid);
                qnaContent.value = "";
            } else {
                alert("사용자 정보를 찾을 수 없거나 내용을 입력하지 않았습니다.");
            }
        }
    } else {
        alert("지정한 페이지에서만 게시물을 추가할 수 있습니다.");
    }
});

const addqna = async (title, content, userId) => {
    try {
        await addDoc(collection(db, "qna"), {
            title,
            content,
            timestamp: new Date(),
            userId,
        });
        loadqna();
    } catch (error) {
        console.error("질문을 추가 중 오류가 발생했습니다.", error);
    }
};

const loadqna = async () => {
    const qnaContainer = document.getElementById("qna");
    qnaContainer.innerHTML = "";

    try {
        const q = query(collection(db, "qna"), orderBy("timestamp", "desc"));
        const querySnapshot = await getDocs(q);

        querySnapshot.forEach(async (postDoc) => {
            const qnaData = postDoc.data();
            const postElement = document.createElement("div");

            const userRef = doc(db, "users", qnaData.userId);
            try {
                const userDoc = await getDoc(userRef);
                let authorName = "Unknown";

                if (userDoc.exists()) {
                    const userData = userDoc.data();
                    authorName = userData.displayName || "Unknown";
                }

                postElement.innerHTML = `
                    <div class="qna-box" style="margin-bottom: 20px; text-align: left;" data-post-id="${postDoc.id}">
                        <div class="post-header">
                            <strong>${escapeHtml(qnaData.title)}</strong>
                        </div>
                        <button class="delete-qna-btn" 
                            data-qna-id="${postDoc.id}"
                            data-qna-user-id="${qnaData.userId}">
                            삭제
                        </button>
                        <div class="post-content">
                            <div class="post-box-content">
                                ${escapeHtml(qnaData.content)}
                            </div>
                        </div>
                        <div class="post-footer">
                            <strong>Writer: ${escapeHtml(authorName)}</strong>
                            <small>/ ${new Date(qnaData.timestamp.seconds * 1000).toLocaleString()}</small>
                        </div>
                        <form class="comments-form" data-post-id="${postDoc.id}" style="display: flex; align-items: center;">
                        <textarea class="comments-content" placeholder="댓글을 입력하세요" required style="flex: 1; margin-right: 10px;"></textarea>
                        <button type="submit">댓글 올리기</button>
                    </form>
                    <div id="comments-${escapeHtml(postDoc.id)}" class="post-comments"></div>
                    </div>
                `;
                qnaContainer.appendChild(postElement);
                loadComments(postDoc.id);
            } catch (error) {
                console.error("유저 정보를 가져오는 중 오류가 발생했습니다:", error);
            }
        });
    } catch (error) {
        console.error("질문을 불러오는 중 오류가 발생했습니다.", error);
    }
};

const deleteqna = async (postId, UserId) => {
    const auth = getAuth();
    const currentUser = auth.currentUser;
    
    if (!currentUser) {
        alert("로그인이 필요합니다.");
        return;
    }

    const userRef = doc(db, "users", currentUser.uid);
    const userDoc = await getDoc(userRef);
    
    if (currentUser.uid !== UserId) {
        if (userDoc.exists() && userDoc.data().isAdmin) {
            await deleteDoc(doc(db, "qna", postId));
            const repliesRef = collection(db, "comments");
            const q = query(repliesRef, where("postId", "==", postId));
            
            const querySnapshot = await getDocs(q);
            for (const docSnapshot of querySnapshot.docs) {
                const docRef = doc(db, "comments", docSnapshot.id);
                await deleteDoc(docRef);
                const repliesRef = collection(db, "replies");
                const q = query(repliesRef, where("commentId", "==", docSnapshot.id));
                
                const querySnapshot = await getDocs(q);
                for (const docSnapshot of querySnapshot.docs) {
                    const docRef = doc(db, "replies", docSnapshot.id);
                    await deleteDoc(docRef);
                }
            }
            loadqna();
        } else {
            alert("본인이 작성한 질문만 삭제할 수 있습니다.");
            return;
        }
    } else {
        await deleteDoc(doc(db, "qna", postId));
        const repliesRef = collection(db, "comments");
        const q = query(repliesRef, where("postId", "==", postId));
        
        const querySnapshot = await getDocs(q);
        for (const docSnapshot of querySnapshot.docs) {
            const docRef = doc(db, "comments", docSnapshot.id);
            await deleteDoc(docRef);
            const repliesRef = collection(db, "replies");
            const q = query(repliesRef, where("commentId", "==", docSnapshot.id));
            
            const querySnapshot = await getDocs(q);
            for (const docSnapshot of querySnapshot.docs) {
                const docRef = doc(db, "replies", docSnapshot.id);
                await deleteDoc(docRef);
            }
        }
        loadqna();
    }
};


document.addEventListener("click", async (e) => {
    if (e.target.classList.contains("delete-qna-btn")) {
        const qnaId = e.target.dataset.qnaId;
        const qnaUserId = e.target.dataset.qnaUserId;

        if (!qnaId || !qnaUserId) {
            console.error("포스트 ID 또는 포스트 ID를 찾을 수 없습니다.");
            return;
        }

        const postElement = e.target.closest(".qna-box");
        const postId = postElement?.dataset.postId;

        if (!postId) {
            console.error("PostId를 찾을 수 없습니다.");
            return;
        }

        if (confirm("정말로 이 질문을 삭제하시겠습니까?")) {
            try {
                await deleteqna(postId, qnaUserId);
                alert("질문이 성공적으로 삭제되었습니다.");
            } catch (error) {
                console.error("질문 삭제 중 오류 발생:", error);
                alert("질문 삭제에 실패했습니다.");
            }
        }
    }
});

onAuthStateChanged(auth, (user) => {
    loadPosts();
    loadAnnouncements();
    loadqna();
    if (user) {
        postForm.style.display = "none";
        announcementForm.style.display = "none";
        qnaForm.style.display = "none";
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
