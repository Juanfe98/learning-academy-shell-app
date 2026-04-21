export const TEST_RUNNER_SRC = `
(function() {
  var _results = [];
  var _currentSuite = "";

  function describe(label, fn) {
    _currentSuite = label;
    try { fn(); } catch(e) { /* suite-level error */ }
    _currentSuite = "";
  }

  function it(label, fn) {
    var fullLabel = _currentSuite ? _currentSuite + " > " + label : label;
    try {
      var ret = fn();
      if (ret && typeof ret.then === "function") {
        ret.then(function() {
          _results.push({ description: fullLabel, pass: true });
          _flush();
        }).catch(function(err) {
          _results.push({ description: fullLabel, pass: false, error: String(err && err.message ? err.message : err) });
          _flush();
        });
        return;
      }
      _results.push({ description: fullLabel, pass: true });
    } catch(err) {
      _results.push({ description: fullLabel, pass: false, error: String(err && err.message ? err.message : err) });
    }
  }

  function expect(value) {
    function make(v, negated) {
      return {
        not: make(v, true),
        toBe: function(expected) {
          var pass = v === expected;
          if (negated) pass = !pass;
          if (!pass) throw new Error("Expected " + JSON.stringify(v) + (negated ? " not" : "") + " to be " + JSON.stringify(expected));
        },
        toEqual: function(expected) {
          var pass = JSON.stringify(v) === JSON.stringify(expected);
          if (negated) pass = !pass;
          if (!pass) throw new Error("Expected " + JSON.stringify(v) + (negated ? " not" : "") + " to equal " + JSON.stringify(expected));
        },
        toBeTruthy: function() {
          var pass = !!v;
          if (negated) pass = !pass;
          if (!pass) throw new Error("Expected " + JSON.stringify(v) + (negated ? " not" : "") + " to be truthy");
        },
        toBeFalsy: function() {
          var pass = !v;
          if (negated) pass = !pass;
          if (!pass) throw new Error("Expected " + JSON.stringify(v) + (negated ? " not" : "") + " to be falsy");
        },
        toBeNull: function() {
          var pass = v === null;
          if (negated) pass = !pass;
          if (!pass) throw new Error("Expected " + JSON.stringify(v) + (negated ? " not" : "") + " to be null");
        },
        toContain: function(expected) {
          var pass = Array.isArray(v) ? v.indexOf(expected) !== -1 : String(v).indexOf(String(expected)) !== -1;
          if (negated) pass = !pass;
          if (!pass) throw new Error("Expected " + JSON.stringify(v) + (negated ? " not" : "") + " to contain " + JSON.stringify(expected));
        },
        toBeGreaterThan: function(n) {
          var pass = v > n;
          if (negated) pass = !pass;
          if (!pass) throw new Error("Expected " + v + (negated ? " not" : "") + " to be greater than " + n);
        },
        toBeLessThan: function(n) {
          var pass = v < n;
          if (negated) pass = !pass;
          if (!pass) throw new Error("Expected " + v + (negated ? " not" : "") + " to be less than " + n);
        },
        toHaveLength: function(n) {
          var pass = v && v.length === n;
          if (negated) pass = !pass;
          if (!pass) throw new Error("Expected length " + (v && v.length) + (negated ? " not" : "") + " to be " + n);
        },
        toThrow: function() {
          var threw = false;
          try { v(); } catch(e) { threw = true; }
          if (negated ? threw : !threw) throw new Error("Expected function " + (negated ? "not " : "") + "to throw");
        },
      };
    }
    return make(value, false);
  }

  /* ── DOM helpers ── */
  var _container = document.createElement("div");
  _container.style.display = "none";
  document.body.appendChild(_container);

  function render(element) {
    _container.innerHTML = "";
    ReactDOM.render(element, _container);
    return _container;
  }

  var screen = {
    getByText: function(text) {
      var els = _container.querySelectorAll("*");
      for (var i = 0; i < els.length; i++) {
        if (els[i].textContent && els[i].textContent.trim() === String(text)) return els[i];
        if (text instanceof RegExp && text.test(els[i].textContent)) return els[i];
      }
      throw new Error("getByText: could not find element with text " + text);
    },
    queryByText: function(text) {
      try { return screen.getByText(text); } catch(e) { return null; }
    },
    getByRole: function(role) {
      var el = _container.querySelector("[role='" + role + "'], " + role);
      if (!el) throw new Error("getByRole: no element with role " + role);
      return el;
    },
    getAllByText: function(text) {
      var matches = [];
      var els = _container.querySelectorAll("*");
      for (var i = 0; i < els.length; i++) {
        var t = els[i].textContent && els[i].textContent.trim();
        if (typeof text === "string" && t === text) matches.push(els[i]);
        else if (text instanceof RegExp && text.test(t)) matches.push(els[i]);
      }
      return matches;
    },
  };

  var fireEvent = {
    click: function(el) {
      el.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    },
    change: function(el, opts) {
      if (opts && opts.target) {
        Object.defineProperty(el, "value", { writable: true, value: opts.target.value });
        el.value = opts.target.value;
      }
      el.dispatchEvent(new Event("change", { bubbles: true }));
      el.dispatchEvent(new Event("input", { bubbles: true }));
    },
    blur: function(el) {
      el.dispatchEvent(new FocusEvent("blur", { bubbles: true }));
    },
    submit: function(el) {
      el.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    },
  };

  function _flush() {
    window.parent.postMessage({ type: "TEST_RESULTS", results: _results }, "*");
  }

  /* Expose globals */
  window.describe = describe;
  window.it = it;
  window.expect = expect;
  window.render = render;
  window.screen = screen;
  window.fireEvent = fireEvent;

  /* Auto-flush after all sync tests have run */
  setTimeout(function() { _flush(); }, 50);
})();
`;
