var modal = document.querySelector(".modal");
var container = document.querySelector(".container")
let count = 100;
const counter = document.getElementById("counter")
function Bet() {
    const randomNumber = Math.floor(Math.random() * 5)  + 1;
    const randomNumberElement = document.getElementById("randomNumber");
    const numberInput = document.getElementById("number");
    const numberValue = parseInt(numberInput.value);
    randomNumberElement.textContent = "Result: " + randomNumber;
    
    if (numberValue === randomNumber) {
        alert("You won");
        count = count +10;
        counter.textContent = count;
         console.log(count)
    } else {
        alert("You lose");
        count -= 10;
        counter.textContent = count;
         console.log(count)
    }

    numberInput.value = ""; 
  
    if(count == 0){
        count = 0
        counter.textContent = count;
        console.log(count)
        alert("Please Refund");
        container.style.display = 'none';
        randomNumberElement.textContent = "Result: " + "";
    }

}
function add(){
     count = count + 10;
    counter.textContent = count;
     console.log(count)   
     container.style.display = 'block';
     modal.style.display = 'none';
}

function closeId() {
    if (modal) {
        modal.style.display = 'none';
    } else {
        console.error("Element not found!");
    }
}
