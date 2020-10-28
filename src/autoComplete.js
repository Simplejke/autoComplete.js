import inputComponent from "./components/Input";
import { generateList, closeAllLists } from "./controllers/listController";
import { navigate } from "./controllers/navigationController";
import {
  getInputValue,
  prepareQueryValue,
  checkTriggerCondition,
  listMatchingResults,
} from "./controllers/dataController";
import debouncer from "./utils/debouncer";
import eventEmitter from "./utils/eventEmitter";

/**
 * @desc This is autoCompleteJS
 * @version 8.0.0.0
 * @example let autoComplete = new autoCompleteJS({config});
 */
export default class autoCompleteJS {
  constructor(config) {
    // Deconstructing config values
    const {
      name = "Search",
      selector = "#autoComplete", // User input selector
      data: {
        src, // Data src selection
        key, // Data src key selection
        cache = true, // Flag to cache data src
      },
      query, // Query interceptor function
      trigger: {
        event = ["input"], // autoCompleteJS event
        condition = false, // condition trigger
      } = {},
      searchEngine = "strict", // Search engine type
      threshold = 0, // Minimum characters length before engine starts rendering
      debounce = 0, // Minimum duration for API calls debounce
      resultsList: {
        render = true,
        container = false,
        destination, // Results list selector
        position = "afterend", // Results list position
        element: resultsListElement = "ul", // Results list element tag
        idName: resultsListId = "autoComplete_list",
        className: resultsListClass = "autoComplete_list",
        navigation = false, // Results list navigation
      } = {},
      sort = false, // Sorting results list
      placeHolder, // Placeholder text
      maxResults = 5, // Maximum number of results to show
      resultItem: {
        content = false, // Result item function
        element: resultItemElement = "li", // Result item element tag
        idName: resultItemId = "autoComplete_result",
        className: resultItemClass = "autoComplete_result",
      } = {},
      noResults, // No results action
      highlight = false, // Highlighting matching results
      feedback, // Data feedback
      onSelection, // Action function on result selection
    } = config;

    // Assigning config values to properties
    this.name = name;
    this.selector = selector;
    this.data = {
      src: () => (typeof src === "function" ? src() : src),
      key,
      cache,
    };
    this.query = query;
    this.trigger = {
      event,
      condition,
    };
    this.searchEngine = searchEngine;
    this.threshold = threshold;
    this.debounce = debounce;
    this.resultsList = {
      render,
      container,
      destination: destination || this.inputField,
      position,
      element: resultsListElement,
      idName: resultsListId,
      className: resultsListClass,
      navigation,
    };
    this.sort = sort;
    this.placeHolder = placeHolder;
    this.maxResults = maxResults;
    this.resultItem = {
      content,
      element: resultItemElement,
      idName: resultItemId,
      className: resultItemClass,
    };
    this.noResults = noResults;
    this.highlight = highlight;
    this.feedback = feedback;
    this.onSelection = onSelection;
    // Invoking preInit automatically
    // when autoCompleteJS instance gets initiated
    this.preInit();
    this.inputField;
  }

  // Run autoCompleteJS processes
  run(event, inputField, data) {
    // 0- Close all open lists
    closeAllLists(false, inputField);
    // 1- Prepare input values
    const rawInputValue = getInputValue(inputField);
    const queryInputValue = prepareQueryValue(rawInputValue, this.query);
    // 2- Get trigger condition
    const triggerCondition = checkTriggerCondition(this.trigger, queryInputValue, this.threshold);
    // 3- Check triggering condition
    if (triggerCondition) {
      // 4- Prepare search engine configurations
      const searchConfig = {
        searchEngine: this.searchEngine,
        highlight: this.highlight,
        key: this.data.key,
        sort: this.sort,
        maxResults: this.maxResults,
      };
      // 5- Match query with existing value
      const searchResults = listMatchingResults(queryInputValue, data, searchConfig);
      /**
       * @emits {response} Emits Event on search response
       **/
      eventEmitter(inputField, { input: rawInputValue, query: queryInputValue, results: searchResults }, "response");
      // 7- Checks if there are NO results
      // Runs noResults action function
      if (!data.length) return this.noResults();
      // 8- Prepare data feedback object
      const dataFeedback = { input: rawInputValue, query: queryInputValue, results: searchResults };
      // 9- If resultsList set not to render
      if (!this.resultsList.render) return this.feedback(event, dataFeedback);
      // List generation configurations object
      const listConfig = {
        inputField,
        rawInputValue: rawInputValue,
        queryInputValue: queryInputValue,
        listId: this.resultsList.idName,
        listClass: this.resultsList.className,
        itemId: this.resultItem.idName,
        itemClass: this.resultItem.className,
        listContainer: this.resultsList.container,
        itemContent: this.resultItem.content,
      };
      // 10- Generate & Render results list
      const list = searchResults.length ? generateList(searchResults, listConfig, this.onSelection) : null;
      /**
       * @emits {rendered} Emits Event after results list rendering
       **/
      eventEmitter(inputField, { input: rawInputValue, query: queryInputValue, results: searchResults }, "rendered");
      // 11- Initialize navigation
      navigate(inputField, list, this.resultsList.navigation);
      /**
       * @desc
       * Listens for all `click` events in the document
       * and closes this menu if clicked outside the list and input field
       * @listens {click} Listens to all `click` events on the document
       **/
      document.addEventListener("click", (event) => closeAllLists(event.target, inputField));
    }
  }

  // Initialization stage
  async init() {
    // If data source
    // set to be cached
    if (this.data.cache) {
      // 1- Prepare the data
      const data = await this.data.src();
      /**
       * @emits {request} Emits Event on search request
       **/
      eventEmitter(this.inputField, data, "request");
      // Set placeholder attribute value
      if (this.placeHolder) this.inputField.setAttribute("placeholder", this.placeHolder);
      // Run executer
      this.exec = debouncer((event) => {
        // 3- Initialize autoCompleteJS processes
        this.run(event, this.inputField, data);
      }, this.debounce);

      // Else if data source
      // set to be streamlined
    } else {
      // Set placeholder attribute value
      if (this.placeHolder) this.inputField.setAttribute("placeholder", this.placeHolder);
      // Run executer
      this.exec = debouncer((event) => {
        // 2- Prepare the data
        const data = await this.data.src();
          /**
           * @emits {request} Emits Event on search request
           **/
          eventEmitter(this.inputField, data, "request");
          // 3- Initialize autoCompleteJS processes
          this.run(event, this.inputField, data);

      }, this.debounce);
    }
    /**
     * @listens {input} Listens to all `input` events on the input field
     **/
    this.inputField.addEventListener("input", this.exec);
    /**
     * @emits {init} Emits Event on Initialization
     **/
    eventEmitter(this.inputField, null, "init");
  }

  // Pre-Initialization stage
  preInit() {
    // Observe DOM changes
    // The entire document will be observed for mutations
    const targetNode = document;
    // Options for the observer (which mutations to observe)
    const config = { childList: true, subtree: true };
    // Callback function to execute when mutations are observed
    const callback = (mutationsList, observer) => {
      // Traditional 'for loops' for IE 11
      for (let mutation of mutationsList) {
        // Check if this is the selected input field
        if (targetNode.querySelector(this.selector)) {
          // If yes disconnect the observer
          observer.disconnect();
          // Assign the input field selector
          this.inputField = targetNode.querySelector(this.selector);
          const inputConfig = {
            inputName: this.name,
            listId: this.resultsList.idName,
            listClass: this.resultsList.className,
            itemId: this.resultItem.idName,
            itemClass: this.resultItem.className,
          };
          inputComponent(this.inputField, inputConfig);
          /**
           * @emits {connect} Emits Event on connection
           **/
          eventEmitter(this.inputField, { mutation }, "connect");
          // Initiate autoCompleteJS
          this.init();
        }
      }
    };
    // Create an observer instance linked to the callback function
    const observer = new MutationObserver(callback);
    // Start observing the target node for configured mutations
    observer.observe(targetNode, config);
  }

  attach() {
    this.init();
  }

  detach() {
    this.inputField.removeEventListener("input", this.exec);
    /**
     * @emits {detached} Emits Event on input eventListener detachment
     **/
    eventEmitter(this.inputField, null, "detached");
  }
}
