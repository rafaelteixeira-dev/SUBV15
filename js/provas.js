document.addEventListener("DOMContentLoaded", function () {
  const role = window.userRole || "student";
  document.getElementById("roleLabel").textContent = role;
  const storageKey = "sub_provas";
  function load() {
    return JSON.parse(localStorage.getItem(storageKey) || "[]");
  }
  function save(arr) {
    localStorage.setItem(storageKey, JSON.stringify(arr));
  }
  function render() {
    const provas = load();
    const myProvasUL = document.getElementById("myProvas");
    const allProvasUL = document.getElementById("allProvas");
    myProvasUL.innerHTML = "";
    allProvasUL.innerHTML = "";
    const userEmail = localStorage.getItem("user_email") || "me@aluno.com";
    provas.forEach((p, idx) => {
      const li = document.createElement("li");
      li.innerHTML =
        "<div><strong>" +
        p.title +
        '</strong><div class="note">Aluno: ' +
        (p.aluno || "—") +
        " • Nota: " +
        p.nota +
        "</div></div>";
      if (role === "student") {
        if (!p.aluno || p.aluno === userEmail) myProvasUL.appendChild(li);
      } else {
        const edit = document.createElement("button");
        edit.textContent = "Editar";
        edit.className = "small";
        edit.addEventListener("click", () => openModal(p, idx));
        const del = document.createElement("button");
        del.textContent = "Remover";
        del.className = "small";
        del.addEventListener("click", () => {
          provas.splice(idx, 1);
          save(provas);
          render();
        });
        li.appendChild(edit);
        li.appendChild(del);
        allProvasUL.appendChild(li);
      }
    });
  }

  function openModal(prova, idx) {
    const modal = document.getElementById("provaModal");
    modal.style.display = "flex";
    document.getElementById("provaTitle").value = prova ? prova.title : "";
    document.getElementById("provaAluno").value = prova
      ? prova.aluno || ""
      : "";
    document.getElementById("provaNota").value = prova ? prova.nota || "" : "";
    document.getElementById("saveProvaBtn").onclick = function () {
      const title = document.getElementById("provaTitle").value.trim();
      const aluno = document.getElementById("provaAluno").value.trim();
      const nota = document.getElementById("provaNota").value.trim();
      if (!title) {
        alert("Título obrigatório");
        return;
      }
      const provas = load();
      const item = { title, aluno, nota };
      if (typeof idx === "number") provas[idx] = item;
      else provas.push(item);
      save(provas);
      modal.style.display = "none";
      render();
    };
    document.getElementById("cancelProvaBtn").onclick = () =>
      (modal.style.display = "none");
  }

  document
    .getElementById("addProvaBtn")
    ?.addEventListener("click", () => openModal(null));
  window.addEventListener("click", (e) => {
    if (e.target.id === "provaModal")
      document.getElementById("provaModal").style.display = "none";
  });

  if (!localStorage.getItem("sub_provas")) {
    const sample = [
      { title: "Prova 1 - Matemática", aluno: "", nota: "" },
      {
        title: "Trabalho - História",
        aluno: "rafael@aluno.com",
        nota: "9",
      },
    ];
    localStorage.setItem("sub_provas", JSON.stringify(sample));
  }

  render();
});
