document.querySelectorAll("[data-auth-form]").forEach((form) => {
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const notice = form.querySelector("[data-auth-notice]");
    notice.textContent = "Account access isn't connected in this demo yet.";
    notice.classList.add("is-visible");
  });
});