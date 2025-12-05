document
  .getElementById("cadastroForm")
  .addEventListener("submit", function (e) {
    e.preventDefault();
    const pwd = document.getElementById("password").value;
    const pwd2 = document.getElementById("confirm-password").value;
    if (pwd !== pwd2) {
      alert("As senhas não coincidem.");
      return;
    }
    const email = document.getElementById("email").value;
    localStorage.setItem("sub_authed", "true");
    localStorage.setItem("user_email", email);
    window.location.href = "/index.html";
  });

document.getElementById("togglePwd").addEventListener("click", () => {
  const el = document.getElementById("password");
  el.type = el.type === "password" ? "text" : "password";
});
document.getElementById("togglePwd2").addEventListener("click", () => {
  const el = document.getElementById("confirm-password");
  el.type = el.type === "password" ? "text" : "password";
});
