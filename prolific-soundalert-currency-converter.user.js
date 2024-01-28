// ==UserScript==
// @name         Prolific SoundAlert & Currency Converter by dukk47
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  A Tampermonkey script for Prolific users: Get notified with sound alerts for new studies and easily convert currencies.
// @author       Jonas Stempel
// @match        https://app.prolific.com/studies*
// @grant        GM_setValue
// @grant        GM_getValue
// ==/UserScript==

(function() {
    'use strict';

    // Audio element for notification
    var audioElement = new Audio('https://www.myinstants.com/media/sounds/notification_alert.mp3');
    audioElement.style.display = 'none';

    // Global variable to save the sound status
    var soundEnabled = GM_getValue("soundEnabled", true);
    // Function to save or receive the ignored study IDs
    function getIgnoredStudies() {
        return GM_getValue("ignoredStudies", []);
    }

    function setIgnoredStudy(studyId, ignore) {
        let ignoredStudies = getIgnoredStudies();
        if (ignore) {
            if (!ignoredStudies.includes(studyId)) {
                ignoredStudies.push(studyId);
            }
        } else {
            ignoredStudies = ignoredStudies.filter(id => id !== studyId);
        }
        GM_setValue("ignoredStudies", ignoredStudies);
    }

    function addIgnoreButtonToStudy(studyElement, studyId) {
        let ignoredStudies = getIgnoredStudies();
        let isIgnored = ignoredStudies.includes(studyId);

        let button = document.createElement("button");
        button.textContent = isIgnored ? "Unignore" : "Ignore";
        button.style.background = "#0c4bba";
        button.style.color = "white";
        button.style.border = "none";
        button.style.borderRadius = "4px";
        button.style.padding = "5px 10px";
        button.style.marginTop = "10px";
        button.style.cursor = "pointer";
        button.style.maxWidth = "100px";
        button.style.display = "block";
        button.style.marginLeft = "auto";
        button.style.marginRight = "auto";

        button.onclick = function() {
            isIgnored = !isIgnored;
            setIgnoredStudy(studyId, isIgnored);
            studyElement.style.opacity = isIgnored ? "0.5" : "1";
            button.textContent = isIgnored ? "Unignore" : "Ignore";
        };

        let directChildDiv = studyElement.querySelector('div');
        if (directChildDiv) {
            directChildDiv.appendChild(button);
            if (isIgnored) {
                studyElement.style.opacity = "0.5";
            }
        }
    }


    function toggleSound() {
        soundEnabled = !soundEnabled;
        GM_setValue("soundEnabled", soundEnabled);


        let soundStatus = document.getElementById("soundStatus");
        soundStatus.textContent = soundEnabled ? "🔊" : "🔇";

    }

    // Function to search for new studies
    function checkForNewStudies() {
        if (window.location.href !== "https://app.prolific.com/studies") {
            return;
        }

        let studyListContainer = document.querySelector("#app > div.layout.participant > div > div > div > div > div.study-list > ul");
        if (!studyListContainer) {
            return;
        }

        let ignoredStudies = getIgnoredStudies();
        let studyElements = studyListContainer.querySelectorAll('li[data-testid^="study-"]');
        let isNewStudyAvailable = false;

        studyElements.forEach(studyElement => {
            let studyId = studyElement.getAttribute('data-testid');
            if (!ignoredStudies.includes(studyId)) {
                isNewStudyAvailable = true;
            }
            if (!studyElement.querySelector("button")) {
                addIgnoreButtonToStudy(studyElement, studyId);
            }
        });

        if (isNewStudyAvailable && soundEnabled) {
            audioElement.play();
        }
    }
    // Intervals for reviewing new studies and updating the page
    setInterval(checkForNewStudies, 1000);
    setInterval(() => {
        if (window.location.href === "https://app.prolific.com/studies") {
           location.reload();
        }
    }, 60000);

    // The target element we want to wait for
    var targetElementSelector = "#app > div.layout.participant > nav > div.links-wrapper > div.left > a:nth-child(3) > span";

    // A function for inserting the new element
    function insertNewMenuItem() {
        // Create the new menu item as an anchor element
        var newMenuItem = document.createElement('a');
        newMenuItem.style.cursor = "pointer";
        newMenuItem.className = "nav-link";

        // Insert the icon and text into the menu element
        newMenuItem.innerHTML = '<span id="soundStatus" style="font-size: 20px;" data-v-49ff849b="">' + (soundEnabled ? "🔊" : "🔇") + '</span>';

        // Add an event listener for click events
        newMenuItem.addEventListener('click', function() {
            toggleSound();
        });

        // Select target tags before the closing </div> tag
        var targetElement = document.querySelector("#app > div.layout.participant > nav > div.links-wrapper > div.left");

        // Neues Menüelement vor dem Zieltag einfügen
        if (targetElement) {
            targetElement.appendChild(newMenuItem);
        }
    }

    // A function that is called when the target element is found
    function handleMutation(mutationsList, observer) {
        // Check whether the target element is present
        if (document.querySelector(targetElementSelector)) {
            // Target element found, stop mutation observer
            observer.disconnect();

            // Insert new menu item
            insertNewMenuItem();
        }
    }

    // Create and start Mutation Observer
    var observer = new MutationObserver(handleMutation);
    observer.observe(document.body, { childList: true, subtree: true });

    // Currency conversion
    let currency = GM_getValue("currency", "GBP");

    function addCurrencyButtons() {
        const targetElement = document.querySelector("#app > div.layout.participant > nav > div.links-wrapper > div.right > div > div > div.ds-dropdown__content > section.awaiting-balance");
        if (targetElement && !document.getElementById("currency-buttons")) {
            // Container for the buttons
            const buttonContainer = document.createElement("div");
            buttonContainer.id = "currency-buttons";
            buttonContainer.style.display = "flex";
            buttonContainer.style.justifyContent = "space-between";
            buttonContainer.style.marginTop = "10px";

            // Creation of the buttons
            ["GBP", "EUR", "USD"].forEach(curr => {
                let button = document.createElement("button");
                button.textContent = curr;
                button.style.margin = "0 5px";
                button.style.cursor = "pointer";
                button.onclick = () => {
                    GM_setValue("currency", curr);
                    currency = curr;
                };
                buttonContainer.appendChild(button);
            });

            targetElement.appendChild(buttonContainer);
        }
    }

    // Function to regularly check whether the target element is present
    function checkForTargetElement() {
        addCurrencyButtons();
    }

    // Set interval to check the target element regularly
    setInterval(checkForTargetElement, 1000);

    function checkAndUpdateAllCurrencyValues() {
        const elements = document.querySelectorAll('body *');

        elements.forEach(element => {
            if (element.childNodes.length) {
                element.childNodes.forEach(child => {
                    if (child.nodeType === Node.TEXT_NODE && (child.textContent.includes('£') || child.textContent.includes('€') || child.textContent.includes('$'))) {
                        updateContent(child);
                    }
                });
            }
        });
    }

    function updateContent(node) {
        let textContent = node.textContent;

        // Regex for pounds, euros and dollars
        const poundRegex = /£\s*([\d,]+\.?\d*)/g;
        const euroRegex = /€\s*([\d,]+\.?\d*)/g;
        const dollarRegex = /\$\s*([\d,]+\.?\d*)/g;

        // Replace all occurrences of currency amounts in the text
        textContent = replaceCurrency(textContent, poundRegex, "GBP");
        textContent = replaceCurrency(textContent, euroRegex, "EUR");
        textContent = replaceCurrency(textContent, dollarRegex, "USD");

        node.textContent = textContent;
    }

    function replaceCurrency(text, regex, originalCurrency) {
        let match;

        while ((match = regex.exec(text)) !== null) {
            let amount = parseFloat(match[1].replace(',', '.'));
            let convertedAmount = convertCurrency(amount, originalCurrency);
            text = text.replace(match[0], `${convertedAmount}`);
        }

        return text;
    }

    function convertCurrency(amount, originalCurrency) {
        // Conversion factors (example values)
        const rates = {
            "GBP": { "EUR": 1.17, "USD": 1.35 },
            "EUR": { "GBP": 0.85, "USD": 1.15 },
            "USD": { "GBP": 0.74, "EUR": 0.87 }
        };

        let targetCurrency = GM_getValue("currency", "GBP");

        if (originalCurrency === targetCurrency) {
            return formatCurrency(amount, targetCurrency);
        }

        let convertedAmount = amount * rates[originalCurrency][targetCurrency];
        return formatCurrency(convertedAmount, targetCurrency);
    }

    function formatCurrency(amount, currency) {
        switch (currency) {
            case "EUR":
                return `€${amount.toFixed(2)}`;
            case "USD":
                return `$${amount.toFixed(2)}`;
            case "GBP":
            default:
                return `£${amount.toFixed(2)}`;
        }
    }


// Set the interval for the regular check
    setInterval(checkAndUpdateAllCurrencyValues, 500);

})();

