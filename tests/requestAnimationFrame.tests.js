const jsdom = require('jsdom').jsdom;
const sinon = require('sinon');
const mockRaf = require('mock-raf')();
const test = require('./helpers').test;

const setup = () => {
    const document = jsdom('<html><body></body></html>');
    global.window = document.defaultView;
    global.requestAnimationFrame = sinon.spy(mockRaf.raf);
    window.requestAnimationFrame = requestAnimationFrame;
};

teardown = () => {
    delete global.requestAnimationFrame;
    delete global.window;
};

test('calls requestAnimationFrame once for multiple event occurrences', (t) => {
    setup();
    t.plan(3);

    const throttle = require('../throttle');
    const throttledListener = throttle(() => {});
    const event = 'resize';
    requestAnimationFrame.reset();

    window.addEventListener(event, throttledListener);

    t.equal(requestAnimationFrame.callCount, 0,
        'sanity check - requestAnimationFrame not called before event dispatch');

    window.dispatchEvent(new window.Event(event));

    t.equal(requestAnimationFrame.callCount, 1,
        'calls requestAnimationFrame upon first event dispatch');

    window.dispatchEvent(new window.Event(event));

    t.equal(requestAnimationFrame.callCount, 1,
        'does not call requestAnimationFrame again upon second event dispatch');
}, teardown);

test('waits until the animation frame to call the callback', (t) => {
    setup();
    t.plan(3);

    const throttle = require('../throttle');
    const listener = sinon.spy();
    const throttledListener = throttle(listener);
    const event = 'resize';

    window.addEventListener(event, throttledListener);

    t.equal(listener.callCount, 0,
        'sanity check - listener not called before event dispatch');

    window.dispatchEvent(new window.Event(event));

    t.equal(listener.callCount, 0,
        'does not call listener upon first event dispatch');

    mockRaf.step();

    t.equal(listener.callCount, 1,
        'calls listener during animation frame');
}, teardown);

test('calls the listener multiple times for multiple event/frame cycles', (t) => {
    setup();
    t.plan(3);

    const throttle = require('../throttle');
    const listener = sinon.spy();
    const throttledListener = throttle(listener);
    const event = 'resize';

    window.addEventListener(event, throttledListener);

    t.equal(listener.callCount, 0,
        'sanity check - listener not called before event dispatch');

    window.dispatchEvent(new window.Event(event));
    mockRaf.step();

    t.equals(listener.callCount, 1,
        'listener is called during first event/frame cycle');

    window.dispatchEvent(new window.Event(event));
    mockRaf.step();

    t.equals(listener.callCount, 2,
        'listener is called during second event/frame cycle');
}, teardown);

test('calls the listener once per event dispatch', (t) => {
    setup();
    t.plan(3);

    const throttle = require('../throttle');
    const listener = sinon.spy();
    const throttledListener = throttle(listener);
    const event = 'resize';

    window.addEventListener(event, throttledListener);

    t.equal(listener.callCount, 0,
        'sanity check - listener not called before event dispatch');

    window.dispatchEvent(new window.Event(event));
    mockRaf.step();

    t.equal(listener.callCount, 1,
        'listener is called during first event/frame cycle');

    mockRaf.step();

    t.equal(listener.callCount, 1,
        'listener is not called during second frame without event');
}, teardown);

test('no longer calls listener after removeEventListener', (t) => {
    setup();
    t.plan(2);

    const throttle = require('../throttle');
    const listener = sinon.spy();
    const throttledListener = throttle(listener);
    const event = 'resize';

    window.addEventListener(event, throttledListener);

    window.dispatchEvent(new window.Event(event));
    mockRaf.step();

    t.equal(listener.callCount, 1,
        'sanity check - listener called during first event/frame cycle');

    window.removeEventListener(event, throttledListener);

    window.dispatchEvent(new window.Event(event));
    mockRaf.step();

    t.equal(listener.callCount, 1,
        'listener is not called during second cycle after throttled listener is removed');
}, teardown);

test('passes the event object to the original listener', (t) => {
    setup();
    t.plan(2);

    const throttle = require('../throttle');
    const listener = sinon.spy();
    const throttledListener = throttle(listener);
    const event = 'resize';
    const eventObject = new window.Event(event);

    window.addEventListener(event, throttledListener);

    window.dispatchEvent(eventObject);
    mockRaf.step();

    t.equal(listener.callCount, 1,
        'sanity check - listener called during first event/frame cycle');

    t.equal(listener.getCall(0).args[0], eventObject,
        'listener called with the provided event object');
}, teardown);
