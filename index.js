/* eslint-disable */
import { __rest } from 'tslib';
import React from 'react';
import { matchPath, Redirect, Route, withRouter, BrowserRouter, HashRouter } from 'react-router-dom';
import { NavContext, IonLifeCycleContext, DefaultIonLifeCycleContext } from '@ionic/react';

let count = 0;
const generateId = () => (count++).toString();

const isDevMode = () => {
    return process && process.env && process.env.NODE_ENV === 'development';
};

const RESTRICT_SIZE = 25;
class LocationHistory {
    constructor() {
        this.locationHistory = [];
    }
    add(location) {
        this.locationHistory.push(location);
        if (this.locationHistory.length > RESTRICT_SIZE) {
            this.locationHistory.splice(0, 10);
        }
    }
    findLastLocation(url) {
        const reversedLocations = [...this.locationHistory].reverse();
        const last = reversedLocations.find(x => x.pathname.toLowerCase() === url.toLowerCase());
        return last;
    }
}

/**
 * The holistic view of all the Routes configured for an application inside of an IonRouterOutlet.
 */
class ViewStacks {
    constructor() {
        this.viewStacks = {};
    }
    get(key) {
        return this.viewStacks[key];
    }
    set(key, viewStack) {
        this.viewStacks[key] = viewStack;
    }
    getKeys() {
        return Object.keys(this.viewStacks);
    }
    delete(key) {
        delete this.viewStacks[key];
    }
    findViewInfoByLocation(location, viewKey) {
        let view;
        let match;
        let viewStack;
        if (viewKey) {
            viewStack = this.viewStacks[viewKey];
            if (viewStack) {
                // viewStack.views.some(matchView);
                // bugfix: first match latest view in stack
                [].concat(viewStack.views).reverse().some(matchView);
            }
        }
        else {
            const keys = this.getKeys();
            keys.some(key => {
                viewStack = this.viewStacks[key];
                // return viewStack.views.reverse().some(matchView);
                // bugfix: first match latest view in stack
                return [].concat(viewStack.views).reverse().some(matchView);
            });
        }
        const result = { view, viewStack, match };
        return result;
        function matchView(v) {
            const matchProps = {
                exact: v.routeData.childProps.exact,
                path: v.routeData.childProps.path || v.routeData.childProps.from,
                component: v.routeData.childProps.component
            };
            match = matchPath(location.pathname, matchProps);

            // bugfix: check url is match or not
            if (match && v._location && location.pathname !== v._location.pathname) {
                match = null;
            }

            if (match) {
                view = v;
                return true;
            }
            return false;
        }
    }
    findViewInfoById(id = '') {
        let view;
        let viewStack;
        const keys = this.getKeys();
        keys.some(key => {
            const vs = this.viewStacks[key];
            view = vs.views.find(x => x.id === id);
            if (view) {
                viewStack = vs;
                return true;
            }
            else {
                return false;
            }
        });
        return { view, viewStack };
    }
}

const RouteManagerContext = /*@__PURE__*/ React.createContext({
    viewStacks: new ViewStacks(),
    syncView: () => { navContextNotFoundError(); },
    hideView: () => { navContextNotFoundError(); },
    setupIonRouter: () => Promise.reject(navContextNotFoundError()),
    removeViewStack: () => { navContextNotFoundError(); },
    transitionView: () => { navContextNotFoundError(); }
});
function navContextNotFoundError() {
    console.error('IonReactRouter not found, did you add it to the app?');
}

/**
 * The View component helps manage the IonPage's lifecycle and registration
 */
class View extends React.Component {
    componentDidMount() {
        /**
         * If we can tell if view is a redirect, hide it so it will work again in future
         */
        const { view } = this.props;
        if (view.route.type === Redirect) {
            this.props.onHideView(view.id);
        }
        else if (view.route.type === Route && view.route.props.render) {
            if (view.route.props.render().type === Redirect) {
                this.props.onHideView(view.id);
            }
        }
    }
    componentWillUnmount() {
        if (this.ionPage) {
            this.ionPage.removeEventListener('ionViewWillEnter', this.ionViewWillEnterHandler.bind(this));
            this.ionPage.removeEventListener('ionViewDidEnter', this.ionViewDidEnterHandler.bind(this));
            this.ionPage.removeEventListener('ionViewWillLeave', this.ionViewWillLeaveHandler.bind(this));
            this.ionPage.removeEventListener('ionViewDidLeave', this.ionViewDidLeaveHandler.bind(this));
        }
    }
    ionViewWillEnterHandler() {
        this.context.ionViewWillEnter();
    }
    ionViewDidEnterHandler() {
        this.context.ionViewDidEnter();
    }
    ionViewWillLeaveHandler() {
        this.context.ionViewWillLeave();
    }
    ionViewDidLeaveHandler() {
        this.context.ionViewDidLeave();
    }
    registerIonPage(page) {
        this.ionPage = page;
        this.ionPage.addEventListener('ionViewWillEnter', this.ionViewWillEnterHandler.bind(this));
        this.ionPage.addEventListener('ionViewDidEnter', this.ionViewDidEnterHandler.bind(this));
        this.ionPage.addEventListener('ionViewWillLeave', this.ionViewWillLeaveHandler.bind(this));
        this.ionPage.addEventListener('ionViewDidLeave', this.ionViewDidLeaveHandler.bind(this));
        this.ionPage.classList.add('ion-page-invisible');
        if (isDevMode()) {
            this.ionPage.setAttribute('data-view-id', this.props.view.id);
        }
        this.props.onViewSync(page, this.props.view.id);
    }
    render() {
        return (React.createElement(NavContext.Consumer, null, value => {
            const newProvider = Object.assign({}, value, { registerIonPage: this.registerIonPage.bind(this) });
            return (React.createElement(NavContext.Provider, { value: newProvider }, this.props.children));
        }));
    }
    static get contextType() {
        return IonLifeCycleContext;
    }
}

/**
 * Manages the View's DOM lifetime by keeping it around long enough to complete page transitions before removing it.
 */
class ViewTransitionManager extends React.Component {
    constructor(props) {
        super(props);
        this.ionLifeCycleContext = new DefaultIonLifeCycleContext();
        this._isMounted = false;
        this.state = {
            show: true
        };
        this.ionLifeCycleContext.onComponentCanBeDestroyed(() => {
            if (!this.props.mount) {
                if (this._isMounted) {
                    this.setState({
                        show: false
                    }, () => {
                        this.context.hideView(this.props.id);

                        // bugfix: remove clone view after go back
                        this.context.removeCloneView(this.props.id);
                    });
                }
            }
        });
    }
    componentDidMount() {
        this._isMounted = true;
    }
    componentWillUnmount() {
        this._isMounted = false;
    }
    render() {
        const { show } = this.state;
        return (React.createElement(IonLifeCycleContext.Provider, { value: this.ionLifeCycleContext }, show && this.props.children));
    }
    static get contextType() {
        return RouteManagerContext;
    }
}

class StackManager extends React.Component {
    constructor(props) {
        super(props);
        this.routerOutletEl = React.createRef();
        this.id = this.props.id || generateId();
        this.handleViewSync = this.handleViewSync.bind(this);
        this.handleHideView = this.handleHideView.bind(this);
    }
    componentDidMount() {
        this.context.setupIonRouter(this.id, this.props.children, this.routerOutletEl.current);
    }
    componentWillUnmount() {
        this.context.removeViewStack(this.id);
    }
    handleViewSync(page, viewId) {
        this.context.syncView(page, viewId);
    }
    handleHideView(viewId) {
        this.context.hideView(viewId);
    }
    renderChild(item) {
        const component = React.cloneElement(item.route, {
            computedMatch: item.routeData.match
        });
        return component;
    }
    render() {
        const context = this.context;
        const viewStack = context.viewStacks.get(this.id);
        const views = (viewStack || { views: [] }).views.filter(x => x.show);
        const ionRouterOutlet = React.Children.only(this.props.children);
        const childElements = views.map(view => {
            return (React.createElement(ViewTransitionManager, { id: view.id, key: view.key, mount: view.mount },
                React.createElement(View, { onViewSync: this.handleViewSync, onHideView: this.handleHideView, view: view }, this.renderChild(view))));
        });
        const elementProps = {
            ref: this.routerOutletEl
        };
        if (isDevMode()) {
            elementProps['data-stack-id'] = this.id;
        }
        const routerOutletChild = React.cloneElement(ionRouterOutlet, elementProps, childElements);
        return routerOutletChild;
    }
    static get contextType() {
        return RouteManagerContext;
    }
}

class NavManager extends React.Component {
    constructor(props) {
        super(props);
        this.locationHistory = new LocationHistory();
        this.state = {
            goBack: this.goBack.bind(this),
            hasIonicRouter: () => true,
            navigate: this.navigate.bind(this),
            getStackManager: this.getStackManager.bind(this),
            getPageManager: this.getPageManager.bind(this),
            currentPath: this.props.location.pathname,
            registerIonPage: () => { return; },
            tabNavigate: this.tabNavigate.bind(this)
        };
        this.listenUnregisterCallback = this.props.history.listen((location) => {
            this.setState({
                currentPath: location.pathname
            });
            this.locationHistory.add(location);
        });
        this.locationHistory.add({
            hash: window.location.hash,
            key: generateId(),
            pathname: window.location.pathname,
            search: window.location.search,
            state: {}
        });
    }
    componentWillUnmount() {
        if (this.listenUnregisterCallback) {
            this.listenUnregisterCallback();
        }
    }
    goBack(defaultHref) {
        const { view: activeIonPage } = this.props.getActiveIonPage();
        if (activeIonPage) {
            const { view: enteringView } = this.props.findViewInfoById(activeIonPage.prevId);
            if (enteringView) {
                const lastLocation = this.locationHistory.findLastLocation(enteringView.routeData.match.url);
                if (lastLocation) {
                    this.props.onNavigate('replace', lastLocation.pathname + lastLocation.search, 'back');
                }
                else {
                    this.props.onNavigate('replace', enteringView.routeData.match.url, 'back');
                }
            }
            else {
                if (defaultHref) {
                    this.props.onNavigate('replace', defaultHref, 'back');
                }
            }
        }
        else {
            if (defaultHref) {
                this.props.onNavigate('replace', defaultHref, 'back');
            }
        }
    }
    navigate(path, direction) {
        this.props.onNavigate('push', path, direction);
    }
    tabNavigate(path) {
        this.props.onNavigate('replace', path, 'back');
    }
    getPageManager() {
        return (children) => children;
    }
    getStackManager() {
        return StackManager;
    }
    render() {
        return (React.createElement(NavContext.Provider, { value: this.state }, this.props.children));
    }
}

class RouteManager extends React.Component {
    constructor(props) {
        super(props);
        this.listenUnregisterCallback = this.props.history.listen(this.historyChange.bind(this));
        this.handleNavigate = this.handleNavigate.bind(this);
        this.state = {
            viewStacks: new ViewStacks(),
            hideView: this.hideView.bind(this),
            setupIonRouter: this.setupIonRouter.bind(this),
            removeViewStack: this.removeViewStack.bind(this),
            syncView: this.syncView.bind(this),
            transitionView: this.transitionView.bind(this),
            removeCloneView: this.removeCloneView.bind(this),
        };
    }
    componentDidUpdate(_prevProps, prevState) {
        // Trigger a page change if the location or action is different
        if (this.state.location && prevState.location !== this.state.location || prevState.action !== this.state.action) {
            this.setActiveView(this.state.location, this.state.action);
        }
    }
    componentWillUnmount() {
        if (this.listenUnregisterCallback) {
            this.listenUnregisterCallback();
        }
    }
    removeCloneView(viewId) {
      const viewStacks = Object.assign(new ViewStacks(), this.state.viewStacks);
      const viewStackKeys = viewStacks.getKeys();

      viewStackKeys.forEach(key => {
          const { view: enteringView } = viewStacks.findViewInfoByLocation(this.state.location, key);
          const stacks = viewStacks.get(key);
          const queue = stacks.queue || [];
          const index = queue.indexOf(enteringView.id);
          const removeIds = queue.slice(index + 1);
          const views = stacks.views;
          const removeViews = views.filter(v => v._location && removeIds.indexOf(v.id) !== -1);
          removeViews.forEach(v => {
              views.splice(views.indexOf(v), 1);
          });
          stacks.queue = queue.slice(0, index + 1);
      });
    }
    hideView(viewId) {
        const viewStacks = Object.assign(new ViewStacks(), this.state.viewStacks);
        const { view } = viewStacks.findViewInfoById(viewId);
        if (view) {
            view.show = false;
            view.ionPageElement = undefined;
            view.isIonRoute = false;
            view.prevId = undefined;
            view.key = generateId();
            this.setState({
                viewStacks
            });
        }
    }

    /**
     * bugfix: fix direction and action
     */
    fixLocation(location, action) {
      let direction = location.state && location.state.direction;

      let viewStacks = null;
      if (direction !== 'forward' && action === 'POP') {
          viewStacks = Object.assign(new ViewStacks(), this.state.viewStacks);
          const viewStackKeys = viewStacks.getKeys();
          viewStackKeys.forEach(key => {
              const { view } = viewStacks.findViewInfoByLocation(location, key);
              if (view) {
                  direction = 'back';
              } else {
                  direction = 'forward';
                  action = 'PUSH';
              }

              location.state = Object.assign({}, location.state, { direction });
          });
      }

      direction = direction || 'forward';

      // clone view if location in history
      if (direction === 'forward' && action === 'PUSH') {
        const viewStacks = Object.assign(new ViewStacks(), this.state.viewStacks);
        const viewStackKeys = viewStacks.getKeys();
        viewStackKeys.forEach(key => {
          const { view, match } = viewStacks.findViewInfoByLocation(location, key);
          const stacks = viewStacks.get(key);

          stacks.queue = stacks.queue || [];

          if (view.show) {
            let cloneView = Object.assign({}, view, {
              _location: location,
              id: generateId(),
              key: generateId(),
              routeData: {
                  match: match,
                  childProps: view.routeData.childProps
              },
              ionPageElement: undefined,
              mount: false,
              show: false,
              isIonRoute: false,
              prevId: null
            });

            stacks.views.push(cloneView);
            stacks.queue.push(cloneView.id);
          } else {
            stacks.queue.push(view.id);
          }
        });
      }

      return {
        location,
        action
      }
    }

    historyChange(location, action) {
        location.state = location.state || { direction: this.currentDirection };
        const obj = this.fixLocation(location, action);
        this.currentDirection = undefined;
        this.setState({
            location: obj.location,
            action: obj.action
        });
    }
    setActiveView(location, action) {
        const viewStacks = Object.assign(new ViewStacks(), this.state.viewStacks);
        let direction = (location.state && location.state.direction) || 'forward';
        let leavingView;
        const viewStackKeys = viewStacks.getKeys();
        viewStackKeys.forEach(key => {
            const { view: enteringView, viewStack: enteringViewStack, match } = viewStacks.findViewInfoByLocation(location, key);
            if (!enteringView || !enteringViewStack) {
                return;
            }
            leavingView = viewStacks.findViewInfoById(this.activeIonPageId).view;
            if (enteringView.isIonRoute) {
                enteringView.show = true;
                enteringView.mount = true;
                enteringView.routeData.match = match;
                this.activeIonPageId = enteringView.id;
                if (leavingView) {
                    if (direction === 'forward') {
                        if (action === 'PUSH') {
                            /**
                             * If the page is being pushed into the stack by another view,
                             * record the view that originally directed to the new view for back button purposes.
                             */
                            // enteringView.prevId = enteringView.prevId || leavingView.id;

                            // bugfix: 
                            enteringView.prevId = leavingView.id;
                        }
                        else {
                            direction = direction || 'back';
                        }
                    }
                }
                this.removeOrphanedViews(enteringView, enteringViewStack);
            }
            else {
                enteringView.show = true;
                enteringView.mount = true;
                enteringView.routeData.match = match;
            }
        });
        if (leavingView) {
            if (!leavingView.isIonRoute) {
                leavingView.mount = false;
                leavingView.show = false;
            }
        }
        this.setState({
            viewStacks
        }, () => {
            const { view: enteringView, viewStack } = this.state.viewStacks.findViewInfoById(this.activeIonPageId);
            if (enteringView && viewStack) {
                const enteringEl = enteringView.ionPageElement ? enteringView.ionPageElement : undefined;
                const leavingEl = leavingView && leavingView.ionPageElement ? leavingView.ionPageElement : undefined;
                if (enteringEl) {
                    // Don't animate from an empty view
                    const navDirection = leavingEl && leavingEl.innerHTML === '' ? undefined : direction === 'none' ? undefined : direction;
                    this.transitionView(enteringEl, leavingEl, viewStack.routerOutlet, navDirection);
                }
                else if (leavingEl) {
                    leavingEl.classList.add('ion-page-hidden');
                    leavingEl.setAttribute('aria-hidden', 'true');
                }
            }
        });
    }
    removeOrphanedViews(view, viewStack) {
        const viewsToRemove = viewStack.views.filter(v => v.prevId === view.id);
        viewsToRemove.forEach(v => {
            this.removeOrphanedViews(v, viewStack);
            // If view is not currently visible, go ahead and remove it from DOM
            if (v.ionPageElement.classList.contains('ion-page-hidden')) {
                v.show = false;
                v.ionPageElement = undefined;
                v.isIonRoute = false;
                v.prevId = undefined;
                v.key = generateId();
            }
            v.mount = false;
        });
    }
    async setupIonRouter(id, children, routerOutlet) {
        const views = [];
        let activeId;
        const ionRouterOutlet = React.Children.only(children);
        React.Children.forEach(ionRouterOutlet.props.children, (child) => {
            views.push(createViewItem(child, this.props.history.location));
        });
        await this.registerViewStack(id, activeId, views, routerOutlet, this.props.location);
        function createViewItem(child, location) {
            const viewId = generateId();
            const key = generateId();
            const route = child;
            const matchProps = {
                exact: child.props.exact,
                path: child.props.path || child.props.from,
                component: child.props.component
            };
            const match = matchPath(location.pathname, matchProps);
            const view = {
                id: viewId,
                key,
                routeData: {
                    match,
                    childProps: child.props
                },
                route,
                mount: true,
                show: !!match,
                isIonRoute: false
            };
            if (match && view.isIonRoute) {
                activeId = viewId;
            }
            return view;
        }
    }
    async registerViewStack(stack, activeId, stackItems, routerOutlet, _location) {
        return new Promise(resolve => {
            this.setState(prevState => {
                const prevViewStacks = Object.assign(new ViewStacks(), prevState.viewStacks);
                const newStack = {
                    id: stack,
                    views: stackItems,
                    routerOutlet
                };
                if (activeId) {
                    this.activeIonPageId = activeId;
                }
                prevViewStacks.set(stack, newStack);
                return {
                    viewStacks: prevViewStacks
                };
            }, () => {
                resolve();
            });
        });
    }
    removeViewStack(stack) {
        const viewStacks = Object.assign(new ViewStacks(), this.state.viewStacks);
        viewStacks.delete(stack);
        this.setState({
            viewStacks
        });
    }
    syncView(page, viewId) {
        this.setState(state => {
            const viewStacks = Object.assign(new ViewStacks(), state.viewStacks);
            const { view } = viewStacks.findViewInfoById(viewId);
            view.ionPageElement = page;
            view.isIonRoute = true;
            return {
                viewStacks
            };
        }, () => {
            this.setActiveView(this.state.location || this.props.location, this.state.action);
        });
    }
    transitionView(enteringEl, leavingEl, ionRouterOutlet, direction) {
        /**
         * Super hacky workaround to make sure ionRouterOutlet is available
         * since transitionView might be called before IonRouterOutlet is fully mounted
         */
        if (ionRouterOutlet && ionRouterOutlet.componentOnReady) {
            this.commitView(enteringEl, leavingEl, ionRouterOutlet, direction);
        }
        else {
            setTimeout(() => {
                this.transitionView(enteringEl, leavingEl, ionRouterOutlet, direction);
            }, 10);
        }
    }
    async commitView(enteringEl, leavingEl, ionRouterOuter, direction) {
        if (enteringEl === leavingEl) {
            return;
        }
        await ionRouterOuter.commit(enteringEl, leavingEl, {
            deepWait: true,
            duration: direction === undefined ? 0 : undefined,
            direction,
            showGoBack: direction === 'forward',
            progressAnimation: false
        });
        if (leavingEl && (enteringEl !== leavingEl)) {
            /** add hidden attributes */
            leavingEl.classList.add('ion-page-hidden');
            leavingEl.setAttribute('aria-hidden', 'true');
        }
    }
    handleNavigate(type, path, direction) {
        this.currentDirection = direction;
        if (type === 'push') {
            this.props.history.push(path);
        }
        else {
            this.props.history.replace(path);
        }
    }
    render() {
        return (React.createElement(RouteManagerContext.Provider, { value: this.state },
            React.createElement(NavManager, Object.assign({}, this.props, { onNavigate: this.handleNavigate, findViewInfoById: (id) => this.state.viewStacks.findViewInfoById(id), findViewInfoByLocation: (location) => this.state.viewStacks.findViewInfoByLocation(location), getActiveIonPage: () => this.state.viewStacks.findViewInfoById(this.activeIonPageId) }), this.props.children)));
    }
}
const RouteManagerWithRouter = withRouter(RouteManager);
RouteManagerWithRouter.displayName = 'RouteManager';

class IonReactRouter extends React.Component {
    render() {
        const _a = this.props, { children } = _a, props = __rest(_a, ["children"]);
        return (React.createElement(BrowserRouter, Object.assign({}, props),
            React.createElement(RouteManagerWithRouter, null, children)));
    }
}

class IonReactHashRouter extends React.Component {
    render() {
        const _a = this.props, { children } = _a, props = __rest(_a, ["children"]);
        return (React.createElement(HashRouter, Object.assign({}, props),
            React.createElement(RouteManagerWithRouter, null, children)));
    }
}

export { IonReactHashRouter, IonReactRouter };
//# sourceMappingURL=index.esm.js.map
