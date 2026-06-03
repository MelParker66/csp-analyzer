var userIndustries = JSON.parse(localStorage.getItem("userIndustries") || "{}");

function saveUserIndustries() {
    localStorage.setItem("userIndustries", JSON.stringify(userIndustries));
}
