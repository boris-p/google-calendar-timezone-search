// ==UserScript==
// @name         Google Calendar Timezone Search
// @namespace    http://tampermonkey.net/
// @version      1.1
// @description  Adds a search box to Google Calendar timezone dropdowns
// @author       Calendar Helper
// @match        https://calendar.google.com/*
// @grant        none
// ==/UserScript==

(function() {
  'use strict';
  
  // Find timezone selectors and add click handlers to them
  function findTimezoneSelectors() {
      // Look for elements that contain "time zone" text
      const timezoneTriggers = [];
      const elementsWithText = document.querySelectorAll('span, div');
      
      elementsWithText.forEach(element => {
          if (element.textContent && element.textContent.toLowerCase().includes('time zone')) {
              // Find the clickable parent that might open the dropdown
              let parent = element;
              
              // Go up at most 3 levels to find a clickable element
              for (let i = 0; i < 3; i++) {
                  if (!parent.parentElement) break;
                  parent = parent.parentElement;
                  
                  if (parent.getAttribute('role') === 'combobox' || 
                      parent.getAttribute('jsaction')?.includes('click')) {
                      
                      if (!timezoneTriggers.includes(parent)) {
                          timezoneTriggers.push(parent);
                      }
                      break;
                  }
              }
          }
      });
      
      // Add click handlers to potential timezone selector triggers
      timezoneTriggers.forEach(trigger => {
          if (!trigger.hasAttribute('tz-listener-added')) {
              trigger.setAttribute('tz-listener-added', 'true');
              
              trigger.addEventListener('click', () => {
                  console.log('Clicked a timezone selector');
                  // Start looking for the dropdown to appear
                  setTimeout(findTimezoneDropdown, 50);
                  setTimeout(findTimezoneDropdown, 150);
                  setTimeout(findTimezoneDropdown, 300);
              });
          }
      });
  }
  
  // Find an open timezone dropdown
  function findTimezoneDropdown() {
      // Check for any ul or div elements that might contain timezone options
      const potentialDropdowns = document.querySelectorAll('ul[role="listbox"], div[role="listbox"]');
      
      for (const dropdown of potentialDropdowns) {
          // Skip if we've already processed this dropdown
          if (dropdown.querySelector('.tz-search-input')) continue;
          
          // Check if this is likely a timezone dropdown by inspecting its content
          const options = dropdown.querySelectorAll('li, div[role="option"]');
          
          if (options.length > 5) {
              let isTimezoneList = false;
              
              // Check if options contain timezone information
              for (const option of options) {
                  const text = option.textContent.toLowerCase();
                  if ((text.includes('gmt') || text.includes('utc')) && 
                      (text.includes('pacific') || text.includes('eastern') || 
                       text.includes('central') || text.includes('mountain'))) {
                      isTimezoneList = true;
                      break;
                  }
              }
              
              if (isTimezoneList) {
                  addSearchToDropdown(dropdown, options);
                  return true;
              }
          }
      }
      
      return false;
  }
  
  // Add search input to timezone dropdown
  function addSearchToDropdown(dropdown, options) {
      console.log('Adding search to timezone dropdown');
      
      // Create search container
      const searchContainer = document.createElement('div');
      searchContainer.className = 'tz-search-container';
      searchContainer.style.padding = '8px';
      searchContainer.style.position = 'sticky';
      searchContainer.style.top = '0';
      searchContainer.style.zIndex = '999999';
      searchContainer.style.backgroundColor = '#fff';
      searchContainer.style.borderBottom = '1px solid #ddd';
      searchContainer.style.width = '100%';
      
      // Create search input
      const searchInput = document.createElement('input');
      searchInput.className = 'tz-search-input';
      searchInput.type = 'text';
      searchInput.placeholder = 'Search for a city...';
      searchInput.style.width = '100%';
      searchInput.style.padding = '8px';
      searchInput.style.boxSizing = 'border-box';
      searchInput.style.border = '1px solid #ddd';
      searchInput.style.borderRadius = '4px';
      searchInput.style.fontSize = '14px';
      
      // Add input to container
      searchContainer.appendChild(searchInput);
      
      // Insert at the beginning of the dropdown
      dropdown.insertBefore(searchContainer, dropdown.firstChild);
      
      // Add event listener for filtering
      searchInput.addEventListener('input', function(e) {
          const searchTerm = this.value.toLowerCase();
          
          options.forEach(option => {
              const text = option.textContent.toLowerCase();
              if (text.includes(searchTerm)) {
                  option.style.display = '';
              } else {
                  option.style.display = 'none';
              }
          });
          
          e.preventDefault();
          e.stopPropagation();
      });
      
      // Prevent events from bubbling up
      searchInput.addEventListener('click', function(e) {
          e.preventDefault();
          e.stopPropagation();
      });
      
      searchInput.addEventListener('keydown', function(e) {
          e.stopPropagation();
      });
      
      // Focus the search input
      setTimeout(() => {
          searchInput.focus();
      }, 50);
  }
  
  // Watch for dialog openings that might contain timezone selectors
  function watchForDialogs() {
      // Look for newly opened dialogs
      const dialogs = document.querySelectorAll('div[role="dialog"]:not([tz-checked])');
      
      dialogs.forEach(dialog => {
          dialog.setAttribute('tz-checked', 'true');
          
          // Check for timezone-related dialog
          const headings = dialog.querySelectorAll('h1, h2, h3, div[role="heading"]');
          for (const heading of headings) {
              if (heading.textContent.toLowerCase().includes('time zone')) {
                  console.log('Found timezone dialog:', heading.textContent);
                  
                  // Look for fields within this dialog
                  const selectableElements = dialog.querySelectorAll('[role="combobox"]');
                  selectableElements.forEach(element => {
                      if (!element.hasAttribute('tz-listener-added')) {
                          element.setAttribute('tz-listener-added', 'true');
                          
                          element.addEventListener('click', () => {
                              console.log('Clicked a timezone field in dialog');
                              setTimeout(findTimezoneDropdown, 50);
                              setTimeout(findTimezoneDropdown, 150);
                              setTimeout(findTimezoneDropdown, 300);
                          });
                      }
                  });
                  
                  // Keep checking for changes in this dialog
                  const dialogObserver = new MutationObserver(() => {
                      setTimeout(findTimezoneDropdown, 100);
                  });
                  
                  dialogObserver.observe(dialog, {
                      childList: true,
                      subtree: true
                  });
              }
          }
      });
  }
  
  // Initialize and start periodic checker
  function initialize() {
      // Initial scan for timezone selectors
      findTimezoneSelectors();
      
      // Set up global click handler to detect when any element is clicked
      document.addEventListener('click', function(e) {
          // Wait a bit for the dropdown to appear, then look for timezone dropdowns
          setTimeout(findTimezoneDropdown, 100);
          watchForDialogs();
      }, true);
      
      // Add a keyboard shortcut for manually triggering search
      document.addEventListener('keydown', function(e) {
          // Alt+Z shortcut
          if (e.altKey && e.key === 'z') {
              console.log('Manual search trigger activated');
              findTimezoneDropdown();
          }
      });
      
      // Watch for DOM changes that might indicate new dialogs or content
      const bodyObserver = new MutationObserver(() => {
          watchForDialogs();
          findTimezoneSelectors();
      });
      
      bodyObserver.observe(document.body, {
          childList: true,
          subtree: true
      });
      
      // Also periodically check for new dialogs
      setInterval(watchForDialogs, 2000);
      
      console.log('Google Calendar Timezone Search initialized');
  }
  
  // Start the script
  setTimeout(initialize, 1000);
})();