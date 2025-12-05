document
  .getElementById("loginForm")
  .addEventListener("submit", function (event) {
    event.preventDefault();

    const email = document.getElementById("email").value;
    localStorage.setItem("sub_authed", "true");
    localStorage.setItem("user_email", email);
    window.location.href = "/index.html";
  });

const toggleLoginPwd = document.getElementById("toggleLoginPwd");
const loginPwd = document.getElementById("password");
toggleLoginPwd?.addEventListener("click", () => {
  loginPwd.type = loginPwd.type === "password" ? "text" : "password";
});
