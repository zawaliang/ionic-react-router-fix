/* eslint-disable */
import { __rest } from 'tslib';
import React__default, { Component } from 'react';
import { Redirect, Route, matchPath, withRouter, BrowserRouter } from 'react-router-dom';
import { NavContext, IonLifeCycleContext, DefaultIonLifeCycleContext } from '@ionic/react';

let count = 0;
const generateId = () => (count++).toString();

const isDevMode = () => {
    return process && process.env && process.env.NODE_ENV === 'development';
};
const deprecationWarning = (message) => {
    if (isDevMode()) {
        console.warn(message);
    }
};

/**
 * The View component helps manage the IonPage's lifecycle and registration
 */
class View extends React__default.Component {
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
        return (React__default.createElement(NavContext.Consumer, null, value => {
            const newProvider = Object.assign({}, value, { registerIonPage: this.registerIonPage.bind(this) });
            return (React__default.createElement(NavContext.Provider, { value: newProvider }, this.props.children));
        }));
    }
    static get contextType() {
        return IonLifeCycleContext;
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
    // bugfix:
    // excludeTop用于排除栈顶的视图，默认为false
    findViewInfoByLocation(location, key, excludeTop) {
        let view;
        let match;
        let viewStack;
        if (key) {
            viewStack = this.viewStacks[key];
            if (viewStack) {
                // viewStack.views.some(matchView);
                let views = [].concat(viewStack.views)

                if (excludeTop) {
                    views.pop()
                }

                views.reverse().some(matchView);
            }
        }
        else {
            const keys = this.getKeys();
            keys.some(key => {
                viewStack = this.viewStacks[key];
                // return viewStack.views.reverse().some(matchView);

                let views = [].concat(viewStack.views)

                if (excludeTop) {
                    views.pop()
                }

                return views.reverse().some(matchView);
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

            // bugfix:
            // clone的视图肯定跟url一一对应，为了避免相邻视图的路由相同时，可能获取错误的情况
            // 例如RAA，末尾A返回时，enteringView获取就会错误
            // 解决方案：路由匹配成功后，再检查url是否匹配
            // 缺陷：存在queryString参数时，可能会判断错误，这里不建议相同路由采用queryString的方式来做参数
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
    setHiddenViews() {
        const keys = this.getKeys();
        keys.forEach(key => {
            const viewStack = this.viewStacks[key];
            viewStack.views.forEach(view => {
                if (!view.routeData.match && !view.isIonRoute) {
                    view.show = false;
                    view.mount = false;
                }
            });
        });
    }
}

const RouteManagerContext = /*@__PURE__*/ React__default.createContext({
    viewStacks: new ViewStacks(),
    syncView: () => { navContextNotFoundError(); },
    hideView: () => { navContextNotFoundError(); },
    setupIonRouter: () => { return Promise.reject(navContextNotFoundError()); },
    removeViewStack: () => { navContextNotFoundError(); },
    transitionView: () => { navContextNotFoundError(); }
});
function navContextNotFoundError() {
    console.error('IonReactRouter not found, did you add it to the app?');
}

/**
 * Manages the View's DOM lifetime by keeping it around long enough to complete page transitions before removing it.
 */
class ViewTransitionManager extends React__default.Component {
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

                        // bugfix:
                        // 1. 转场结束后移除id对应的clone视图，避免下次进入时复用了clone的视图，造成渲染错误
                        // 2. 通过history触发的返回也会走到这里，像go(-n)这种情况可能会跨几个视图，也需要移除
                        //    但是go(-n)只会设置id对应的页面的show为false，其间被返回的页面不会设置show=false,造成DOM还存在于页面中
                        //    eg： ABABC->ABA，this.props.id=C.id,第二个B对应的页面没有被移除
                        // 综述，被移除的视图show=false且存在_location属性
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
        return (React__default.createElement(IonLifeCycleContext.Provider, { value: this.ionLifeCycleContext }, show && this.props.children));
    }
    static get contextType() {
        return RouteManagerContext;
    }
}

class StackManager extends React__default.Component {
    constructor(props) {
        super(props);
        this.routerOutletEl = React__default.createRef();
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
        const component = React__default.cloneElement(item.route, {
            computedMatch: item.routeData.match
        });
        return component;
    }
    render() {
        const context = this.context;
        const viewStack = context.viewStacks.get(this.id);
        const views = (viewStack || { views: [] }).views.filter(x => x.show);
        const ionRouterOutlet = React__default.Children.only(this.props.children);
        const childElements = views.map((view) => {
            return (React__default.createElement(ViewTransitionManager, { id: view.id, key: view.key, mount: view.mount },
                React__default.createElement(View, { onViewSync: this.handleViewSync, onHideView: this.handleHideView, view: view }, this.renderChild(view))));
        });
        const elementProps = {
            ref: this.routerOutletEl
        };
        if (isDevMode()) {
            elementProps['data-stack-id'] = this.id;
        }
        const routerOutletChild = React__default.cloneElement(ionRouterOutlet, elementProps, childElements);
        return routerOutletChild;
    }
    static get contextType() {
        return RouteManagerContext;
    }
}

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

class NavManager extends React__default.Component {
    constructor(props) {
        super(props);
        this.locationHistory = new LocationHistory();
        this.state = {
            goBack: this.goBack.bind(this),
            hasIonicRouter: () => true,
            getHistory: this.getHistory.bind(this),
            getLocation: this.getLocation.bind(this),
            navigate: this.navigate.bind(this),
            getStackManager: this.getStackManager.bind(this),
            getPageManager: this.getPageManager.bind(this),
            currentPath: this.props.location.pathname,
            registerIonPage: () => { } //overridden in View for each IonPage
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
                    this.props.history.replace(lastLocation.pathname + lastLocation.search, { direction: 'back' });
                }
                else {
                    this.props.history.replace(enteringView.routeData.match.url, { direction: 'back' });
                }
            }
            else {
                defaultHref && this.props.history.replace(defaultHref, { direction: 'back' });
            }
        }
        else {
            defaultHref && this.props.history.replace(defaultHref, { direction: 'back' });
        }
    }
    getHistory() {
        return this.props.history;
    }
    getLocation() {
        return this.props.location;
    }
    navigate(path, direction) {
        this.props.history.push(path, { direction });
    }
    getPageManager() {
        return (children) => children;
    }
    getStackManager() {
        return StackManager;
    }
    render() {
        return (React__default.createElement(NavContext.Provider, { value: this.state }, this.props.children));
    }
}

class RouteManager extends React__default.Component {
    constructor(props) {
        super(props);
        this.listenUnregisterCallback = this.props.history.listen(this.historyChange.bind(this));
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

    // 移除clone的视图
    removeCloneView(viewId) {
        const viewStacks = Object.assign(new ViewStacks(), this.state.viewStacks);
        const viewStackKeys = viewStacks.getKeys();

        viewStackKeys.forEach(key => {
            // 找到当前location对应的最新的一个视图，移除其后的clone视图
            // 一般是返回的时候需要移除，所以需要排除最后一个，避免相邻相同url的路由
            const { view: enteringView } = viewStacks.findViewInfoByLocation(this.state.location, key, true);
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
     * bugfix: 修正history变更时的参数
     *
     * react-router针对多次调用同一个路由的情况，是采取将上一次缓存的页面切换层级的方式来显示
     * 所以多次调用同一个路由，DOM中只有一份
     * 且当goBack的时候，会unmount这个页面，造成同路由的页面在返回时获取不到缓存，会重新初始化
     * 表现出来的就是ABA->AB->A时，A页面重新mount了，重新触发了一次初始化逻辑等
     */
    fixLocation(location, action) {
        // history库的push：forward PUSH
        // history库的replace：forward REPLACE
        // 按IonBackButton：back REPLACE，会触发ViewTransitionManager
        // 点击tabs切换：none PUSH (点击tabs切换后，再通过history.back等返回，此时的direction为none)
        // 通过history库调用触发的location变化，跟window.history类似; goFowward()、go()、goBack()的location.state为空，action=POP，会触发ViewTransitionManager;
        // 通过window.history调用触发的location变化，不管是back、go、forward，location.state为空，action=POP，会触发ViewTransitionManager;
        let direction = location.state && location.state.direction;

        // 若是history调用触发，修正是PUSH还是POP
        let viewStacks = null;
        if (direction !== 'forward' && action === 'POP') {
            viewStacks = Object.assign(new ViewStacks(), this.state.viewStacks);
            const viewStackKeys = viewStacks.getKeys();
            viewStackKeys.forEach(key => {
                const { view } = viewStacks.findViewInfoByLocation(location, key);
                // 存在view认为是back操作（也有可能是forward操作，这里都认为是back）
                // 不存在则是forward（原则上history.forward()操作很少）
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


        // TODO: forward/REPLACE的情况暂不优化，走原有逻辑（RABC->RABA，C替换为A，则返回时直接回到R）

        // 检查视图是否存在于缓存中，是的话则需要新建视图，不使用原有视图
        if (direction === 'forward' && action === 'PUSH') {
            const viewStacks = Object.assign(new ViewStacks(), this.state.viewStacks);
            const viewStackKeys = viewStacks.getKeys();
            viewStackKeys.forEach(key => {
                const { view, match } = viewStacks.findViewInfoByLocation(location, key);
                const stacks = viewStacks.get(key);

                // 自定义堆栈队列，按访问顺序记录
                stacks.queue = stacks.queue || [];

                // view.show=true说明当前视图在历史堆栈中
                if (view.show) {
                    // 克隆一个新的视图
                    let cloneView = Object.assign({}, view, {
                        _location: location,
                        id: generateId(),
                        key: generateId(),
                        routeData: {
                            // 注意2个视图间match.params参数可能不同
                            // match格式： {
                            //   isExact: true
                            //   params: {
                            //     org_id: "1CCA071E385B3CAF86277AEE5309A0D9"
                            //     tab: "home"
                            //   }
                            //   path: "/:tab(home|fund|intelligence|me)/company/:org_id"
                            //   url: "/home/company/1CCA071E385B3CAF86277AEE5309A0D9"
                            // }
                            match: match,
                            childProps: view.routeData.childProps
                        },
                        ionPageElement: undefined,
                        mount: false,
                        show: false,
                        isIonRoute: false,
                        prevId: null
                    });

                    // 默认的views数组跟访问的路由顺序无关，只是维护了所有路由的对应关系；
                    // 这里将自定义添加的视图按访问顺序缓存到已有的views数组中
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
        const obj = this.fixLocation(location, action);

        this.setState({
            location: obj.location,
            action: obj.action
        });
    }
    setActiveView(location, action) {
        const viewStacks = Object.assign(new ViewStacks(), this.state.viewStacks);
        let direction = location.state && location.state.direction || 'forward';
        let leavingView;
        const viewStackKeys = viewStacks.getKeys();
        viewStackKeys.forEach(key => {
            let { view: enteringView, viewStack: enteringViewStack, match } = viewStacks.findViewInfoByLocation(location, key);

            if (!enteringView || !enteringViewStack) {
                return;
            }

            leavingView = viewStacks.findViewInfoById(this.activeIonPageId).view;

            // bugfix:
            // 当路由相同而参数不同时，url地址会不相同，findViewInfoByLocation能获取到对应的视图
            // 但当路由是一个纯路由，没有其他参数时，nav.forward正常，但返回时由于相邻路由相同，enter视图获取失败（enter与leave的视图相同）
            // 此时栈顶的视图不可作为候选视图，需要移除后才能判断
            if (enteringView === leavingView && location.state && location.state.direction === 'back') {
                const fixObj = viewStacks.findViewInfoByLocation(location, key, true);
                enteringView = fixObj.view;
                enteringViewStack = fixObj.viewStack;
                match = fixObj.match;

                if (!enteringView || !enteringViewStack) {
                    return;
                }
            }

            if (enteringView) {
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
                                // 4.10.0-rc.3修改为上面的形式，但会造成ABCB返回时，直接回到A
                                // 由于修复方案不存在缓存，所以不需要enteringView.prevId
                                enteringView.prevId = leavingView.id;
                            }
                            else {
                                direction = direction || 'back';
                                leavingView.mount = false;
                            }
                        }
                        else if (action === 'REPLACE') {
                            leavingView.mount = false;
                        }

                        // bugfix: 修正history的PUSH/POP后，需要对这类型的视图进行移除
                        else if (direction === 'back') {
                            leavingView.mount = false;
                        }
                    }
                }
                else {
                    enteringView.show = true;
                    enteringView.mount = true;
                    enteringView.routeData.match = match;
                }
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
    componentWillUnmount() {
        this.listenUnregisterCallback && this.listenUnregisterCallback();
    }
    async setupIonRouter(id, children, routerOutlet) {
        const views = [];
        let activeId;
        const ionRouterOutlet = React__default.Children.only(children);
        React__default.Children.forEach(ionRouterOutlet.props.children, (child) => {
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
                route: route,
                mount: true,
                show: !!match,
                isIonRoute: false
            };
            if (!!match && view.isIonRoute) {
                activeId = viewId;
            }
            return view;
        }
    }
    async registerViewStack(stack, activeId, stackItems, routerOutlet, _location) {
        return new Promise((resolve) => {
            this.setState((prevState) => {
                const prevViewStacks = Object.assign(new ViewStacks, prevState.viewStacks);
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
    ;
    removeViewStack(stack) {
        const viewStacks = Object.assign(new ViewStacks(), this.state.viewStacks);
        viewStacks.delete(stack);
        this.setState({
            viewStacks
        });
    }
    syncView(page, viewId) {
        this.setState((state) => {
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
            direction: direction,
            showGoBack: direction === 'forward',
            progressAnimation: false
        });
        if (leavingEl && (enteringEl !== leavingEl)) {
            /** add hidden attributes */
            leavingEl.classList.add('ion-page-hidden');
            leavingEl.setAttribute('aria-hidden', 'true');
        }
    }
    render() {
        return (React__default.createElement(RouteManagerContext.Provider, { value: this.state },
            React__default.createElement(NavManager, Object.assign({}, this.props, { findViewInfoById: (id) => this.state.viewStacks.findViewInfoById(id), findViewInfoByLocation: (location) => this.state.viewStacks.findViewInfoByLocation(location), getActiveIonPage: () => this.state.viewStacks.findViewInfoById(this.activeIonPageId) }), this.props.children)));
    }
}
const RouteManagerWithRouter = withRouter(RouteManager);
RouteManagerWithRouter.displayName = 'RouteManager';
class IonReactRouter extends React__default.Component {
    render() {
        const _a = this.props, { children } = _a, props = __rest(_a, ["children"]);
        return (React__default.createElement(BrowserRouter, Object.assign({}, props),
            React__default.createElement(RouteManagerWithRouter, null, children)));
    }
}

class ViewManager extends Component {
    componentDidMount() {
        deprecationWarning('As of @ionic/react RC2, ViewManager is no longer needed and can be removed. This component is now deprecated will be removed from @ionic/react final.');
    }
    render() {
        return this.props.children;
    }
}

export { IonReactRouter, ViewManager };
//# sourceMappingURL=index.esm.js.map
