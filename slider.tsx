import { slideTrigger } from "@lge/config/const/slider-const";
import { setStyle } from "@lge/libs/libs";
import { useEffect, useState, useRef, useCallback } from "react";
import { SliderContext, slideAction } from "../provider/provider";
import Easing from "./easing";

/**
 * @name Slider
 * @param 
 *  - children  : Element
 *  - limit     : Boolean
 *  - onClick   : Function
 * @returns 
 * @description
 * - 
 */
export default function Slider( { 
        children, 
        limit = true, 
        onClick = ()=>{}, 
        event = ()=>{},
        index = 0,
        infinity = false,
        arrow = true,
        setControl=()=>{},
        limitNoCount = false,
        duration=600,
        easing="easeOutCubic"
    }:
    {   children: any;
        limit?: boolean;
        onClick?: Function; 
        event?: any;
        index?: number;
        infinity?: boolean;
        setControl?: Function;
        arrow?: boolean;
        limitNoCount?: boolean;
        option?: any;
        duration?: number;
        easing?:string;
    }) {
    
    /**
     * #HookList
     * @description
     * - 
     */
    const 
        [ resize, setResize ] = useState<any>({}),
        // drag 여부
        [ isDrag, setDrag ] = useState(false),
        // 무한 슬라이드 조건 활성화 여부
        [ infiniteSlide, setInfiniteSlide ] = useState(false),
        // 화살표 버튼 활성, 비활성
        [ arState, setArState ] = useState<any>({
            first: false,
            last: false
        }),
        // 드래그 최소 반응 값
        reactionSize: number = 20,
        // 드래그 영역(대상)
        container:any = useRef(null),
        // 목록 컨테이너
        list: any = useRef(null),
        // 초기화 타이머
        finishTimer: any = useRef(null),
        // 슬라이드 index
        sCount: any = useRef(0),
        // drag 상태 값
        drag: any = useRef({});

    /**
     * #EventList
     * @description
     * -
     */
    const actionEventName: Array<string> = [  
            'touchstart',
            'touchmove',
            'touchend',
            'touchleave',
            'touchcancel'
        ],
        // 드래그 대상의 부모 엘리먼트의 넓이
        getItemWidth=()=>{
            let val: any = 0;
            if( container?.current && list?.current && list?.current.children?.length ) val = list?.current.children[0].offsetWidth;
            return val;
        }
    
    /**
     * @name getTarget
     * @returns 
     * @description
     * - ESLINT warning 대응 함수
     * - 
     */
    const getTarget=()=>{
        let target: any = { };
        if( container?.current ) {
            target = container.current;
        }
        return target;
    }

    /**
     * @name getElementStyle
     * @returns
     * @description
     * - 
     */
    const getElementStyle=()=>{
        return window.getComputedStyle( getTarget() );
    };

    /**
     * @name slideEvent
     * @description
     * - 
     */
    const slideEvent=useCallback( (action: any )=>{
        let 
            max: number = list.current.children?.length,
            index: number = action?.index < 0 ? ( max + action?.index ) : ( action?.index%max );
        
        event({
            type: action?.type,
            index: index,
        });
    }, [event]);

    /**
     * @name dragEnd
     * @param loop
     * @returns 
     * @description
     * - 
     */
    const dragEnd=useCallback( ()=>{
        slideFinish();
        if( !drag.current.draging ) {
            return;
        }
        if( container.current ) { 
            // 최소 이동값 충족 여부 확인 및 이동 처리
            if( Math.abs( drag.current.movePoint ) > reactionSize ) {
                dragAfterAction();
            } 
            /**
            * @description
            * - 최소 이동값 미충족시 원위치로 이동
            */ 
            else {
               dragSelected( sCount.current );
            }
        }
        // 초기화
        drag.current = {};
        // eslint-disable-next-line
    },[ infiniteSlide ]);

    /**
     * @name dragEnd
     * @description
     * - 
     */
    const dragAfterAction=useCallback( ()=>{
        if(!infiniteSlide) { 
            const limit: number = list?.current.children.length-1;
            let slideIndex: number = drag.current.movePoint > 0 ? sCount.current+1 : sCount.current-1;
            if( slideIndex < 0 ) slideIndex = 0;
            if( slideIndex > limit ) slideIndex = limit;
            if( slideIndex !== sCount.current ) {
                slideEvent({ 
                    type: slideAction.SLIDE_CHANGE,
                    index: slideIndex
                });
                dragSelected( slideIndex );
            } else {
                dragSelected( sCount.current );
            }
        }
        /**
         * @TODO Infinity
         * @description
         * - 
         */
        else {
            let slideIndex: number = drag.current.movePoint > 0 ? sCount.current+1 : sCount.current-1;
            slideEvent({ 
                type: slideAction.SLIDE_CHANGE,
                index: slideIndex
            });
            dragSelected( slideIndex );
        }
        // eslint-disable-next-line
    },[infiniteSlide,slideEvent]);
    
    /**
     * @name actionEvent
     * @param e 
     * @description
     * -
     */
    const actionEvent=useCallback( async( e: any )=> {
        document.body.setAttribute("ondragstart","return false");
        document.body.setAttribute("onselectstart","return false");
        if( finishTimer.current ) return;

        const 
            touchProps = e.changedTouches?.[0],
            touchX = touchProps?.clientX || 0;

        switch( e.type ) {

            /**
             * @DragStart
             * @description
             * - down offset point
             */
            case "touchstart":
                if( !drag.current.dragStart ) { 
                    if(e.cancelable) e.stopPropagation();
                    drag.current.dragStart = true;
                    drag.current.startPoint = touchX;

                    const 
                        style: any = getElementStyle(),
                        matrix: any = new WebKitCSSMatrix( style.transform ),
                        itemWidth = getItemWidth();
                    
                    drag.current.offsetPoint = matrix.m41;
                    drag.current.itemWidth = itemWidth;
                }
            break;

            /**
             * @Drag
             * @description
             * - down drag
             */
            case "touchmove":
                if(e.cancelable) e.preventDefault();
                if( drag.current.dragStart ) { 
                    drag.current.movePoint = Math.ceil( drag.current.startPoint - touchX );
                    drag.current.moveX = drag.current.offsetPoint - drag.current.movePoint;
                    if( Math.abs( drag.current.movePoint ) > 10 ) {
                        drag.current.draging = true;
                        if( !isDrag ) {
                            await setDrag( true );
                        }
                    }
                    dragMove( drag.current.moveX );
                }
            break;

            /**
             * @DragEnd
             * @description
             * - 
             */
            case "touchend":
            case "touchleave":
                if( drag.current.draging ) {
                    dragEnd();
                } else {
                    dragSelected( sCount?.current );
                }
            break;
        }
        // eslint-disable-next-line
    },[isDrag,infiniteSlide,setDrag]);

    /**
     * @name clearAfterfinishTimerr
     * @description
     * - 
     */
    const clearAfterfinishTimerr=()=>{
        if(finishTimer.current) { 
            clearTimeout(finishTimer.current);
        }
    }

    /**
     * @name clearTimeout
     * @param reset
     * @description
     * - 
     */
    const slideFinish=useCallback( ()=>{
        clearAfterfinishTimerr();
        finishTimer.current = setTimeout( ()=>{
            fakePos();
            setDrag( false );
            finishTimer.current = null;
        },duration);
        // eslint-disable-next-line
    },[setDrag,duration]);

    /**
     * @name fakePos
     * @description
     * -  
     */
    const fakePos=useCallback( ()=>{
        if( !list?.current?.children ) return;
        const max = list?.current?.children?.length;
        if( sCount.current < 0 ) {
            dragSelected( max-1, false );
        }
        if( sCount.current > max-1 ) {
            dragSelected( 0, false );
        }
        // eslint-disable-next-line
    },[]);

    /**
     * @name setArrowState
     * @desription
     * - 
     */
    const setArrowState=useCallback(( state: any )=>{
        if( !infinity || limitNoCount ) {
            setArState( (p:any)=>( { ...p, ...state }));
        }
    },[limitNoCount,infinity,setArState]);

    /**
     * @name getArrowstate
     * @description
     * - 
     */
    const getArrowstate=useCallback(( str: string )=>{
        return ( !infinity  || limitNoCount ) ? arState?.[str] : false;
    },[infinity,limitNoCount,arState]);

    const 
        /**
         * @name resizeEvent
         * @description
         * - hook > resize update
         */
        resizeEvent=useCallback(( e: any )=>setResize({ 
            width: window.innerWidth, 
            height: window.innerHeight
        }),[]),

        /**
         * @name eventListener
         * @description
         * - 이벤트 등록 및 제거
         */
        eventListener=useCallback( ( add: boolean )=>{
            if( getTarget()?.parentElement ) {
                actionEventName.map( event => getTarget()?.parentElement[ add ? 'addEventListener' : 'removeEventListener']( event, actionEvent ) )
            }
            // eslint-disable-next-line
        },[isDrag,actionEvent]),

        /**
         * @name dragMove
         * @description
         * - 드래그
         */
        dragMove=( x: number )=>{
            const applyX: number = x;
            if( getTarget() ) { 
                setStyle( 
                    getTarget(), 
                    getEasing( applyX, '' )
                )
            }
        },

        cbz=( type: string )=>{
            return Easing.cubicbezier( type );
        },

        getEasing=( posx: number, easingType: string = easing )=>{
            return easingType ? {
                '-webkit-transition': '-webkit-transform '+duration+'ms '+cbz( easingType ),
                '-moz-transition': '-moz-transform '+duration+'ms '+cbz( easingType ),
                '-o-transition': '-o-transform '+duration+'ms '+cbz( easingType ),
                'transition': 'transform '+duration+'ms '+cbz( easingType ),
                '-webkit-transform':'translateX('+posx+'px)',
                '-moz-transform':'translateX('+posx+'px)',
                '-o-transform':'translateX('+posx+'px)',
                '-ms-transform':'translateX('+posx+'px)',
                'transform':'translateX('+posx+'px)'
            } : {
                '-webkit-transition': '-webkit-transform 0ms',
                '-moz-transition': '-moz-transform 0ms',
                '-o-transition': '-o-transform 0ms',
                'transition': 'transform 0ms',
                '-webkit-transform':'translateX('+posx+'px)',
                '-moz-transform':'translateX('+posx+'px)',
                '-o-transform':'translateX('+posx+'px)',
                '-ms-transform':'translateX('+posx+'px)',
                'transform':'translateX('+posx+'px)'
            }
        },

        /**
         * @name dragSelected
         * @description
         * - 이동 (최종 위치)
         */
        dragSelected=useCallback( async( n: number, ani:boolean = true )=> {
            let 
                applyX: number = (-n) * getItemWidth(),
                over: boolean = false;

            const 
                listWrap: any = container.current,
                listContainer : any = list.current;

            if( !listContainer ) {
                return;
            }

            const 
                parentWidth: number = listWrap.parentElement.offsetWidth,
                limitX: number = -(getListOffsetWidth() - parentWidth);

            // 이동 리미트 적용
            if( !infinity && ( Math.abs( applyX ) > Math.abs( limitX ) - reactionSize && limit ) ) {
                applyX = limitX;
                over = true;
            }

            // 이동 처리
            setStyle( 
                getTarget(), 
                getEasing( applyX, ( ani ? easing : '' ) )
            );
           
            if( limitNoCount ) {
                if( !over ) {
                    // 이동 구분, 위치 확인 값 ( slide index )
                    sCount.current = n;
                    setArrowState( { last: false })
                } else {
                    setArrowState( { last: true })
                }
            } else {
                // 이동 구분, 위치 확인 값 ( slide index )
                sCount.current = n;
                // 우측 화살표 활성, 비활성 여부
                setArrowState( { last: n === list.current?.children?.length-1 });
            }

            // 좌측 화살표 활성, 비활성 여부
            setArrowState( { first: n === 0 });

            if( ani ) { 
                slideFinish();
            }            
        // eslint-disable-next-line
        },[infinity,limitNoCount]);
    
    /**
     * @name controller
     * @description
     * - 
     */
    const controller=useCallback(( type: string )=>{
        if( finishTimer.current ) return;
        switch( type ) {
            case slideTrigger.SLIDER_TRIGGER_NEXT:
                drag.current.movePoint = 500;
                drag.current.draging = true;
                dragEnd();
            break;
            case slideTrigger.SLIDER_TRIGGER_PREV:
                drag.current.movePoint = -500;
                drag.current.draging = true;
                dragEnd();
            break;
            case slideTrigger.SLIDER_TRIGGER_RESET:
                dragSelected(0);
            break;
        }
        // eslint-disable-next-line
    },[infinity,infiniteSlide]);

    /**
     * @name getListOffsetWidth
     * @returns
     * @description
     * - 
     */
    const getListOffsetWidth=()=>{
        return list?.current?.offsetWidth;
    }

    /**
     * @name isSizeOver
     * @returns 
     */
    const isSizeOver=()=>{
        const parentWidth: number = getTarget()?.parentElement?.offsetWidth || 0;
        return getListOffsetWidth() > parentWidth;
    }

    /**
     * #Init
     * @description
     * - 이벤트 등록
     */
     useEffect(()=>{
        window.addEventListener('resize', resizeEvent );
        setControl( controller );
        return () => {
            window.removeEventListener('resize', resizeEvent );
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    },[]);
    
    /** 
     * @TODO update selected index
     * @description
     * - 
     */
     useEffect(()=>{
        slideEvent({ 
            type: isDrag ? slideAction.SLIDE_START : slideAction.SLIDE_END,
            index: sCount
        });
        // eslint-disable-next-line
    },[isDrag,slideEvent]);

    /**
     * #reset
     * @description
     * - 
     */
    useEffect( ()=>{
        if( container?.current && list?.current ){
            if( isSizeOver() ) {
                eventListener( true );
                if( infinity ) { 
                    setInfiniteSlide( true );
                } else {
                    setInfiniteSlide( false );
                }
            } else {
                eventListener( false);
            }

            if( list?.current?.children ) {
                slideEvent({ 
                    type: slideAction.SLIDE_CHANGE,
                    index: 0
                });
                dragSelected( 0 );
            }
        }

        return ()=> eventListener( false );
        // eslint-disable-next-line
    },[
        infinity,
        container?.current?.offsetWidth, 
        list?.current?.offsetWidth,
        resize?.width,
        limitNoCount
    ]);

    const showArrow: boolean = isSizeOver() && arrow;

    return (
        <SliderContext.Provider value={ { } }>
            {
                showArrow && (
                    <button 
                        onClick={()=>controller( slideTrigger.SLIDER_TRIGGER_PREV )}
                        className={`slick-prev slick-arrow ${ getArrowstate('first') && 'slick-disabled'}`}
                        style={ getArrowstate('first') ? { pointerEvents:'none'} : {} }
                        type="button">
                        <span className="visually-hidden">
                            Previous
                        </span>
                    </button>
                )
            }
             
            <div className='slider-wrap'>
                <div 
                    className='slider-container' 
                    ref={container}>
                    <div 
                        className='slider-infinity-wrap'
                        style={{
                            position:'relative',
                            display:'flex',
                            flexDirection:'row',
                            transform: `translateX( ${ infiniteSlide ? `-33.33333%` : '0px' })`
                        }}>
                        <div 
                            className='slider-inner' 
                            ref={list} 
                            style={ 
                                isDrag ? { 
                                    pointerEvents:'none',
                                } : {
                                } 
                            }>
                            {children}
                        </div>
                        { infiniteSlide && ( 
                        <>
                            <div 
                                className='slider-inner slider-previous' 
                                style={ 
                                    isDrag ? { 
                                        pointerEvents:'none',
                                        //minWidth: minWidth + 'px'
                                    } : {
                                        //minWidth: minWidth + 'px'
                                    } 
                                }>
                                {children}
                            </div>
                            <div className='slider-inner slider-next' 
                                style={ 
                                    isDrag ? { 
                                        pointerEvents:'none',
                                        //minWidth: minWidth + 'px'
                                    } : {
                                        //minWidth: minWidth + 'px'
                                    } }>
                                {children}
                            </div>
                        </>
                        ) 
                    }
                    </div>
                </div>
            </div>
            {
                showArrow && (
                    <button 
                        onClick={()=>controller( slideTrigger.SLIDER_TRIGGER_NEXT )}
                        className={`slick-next slick-arrow ${ getArrowstate('last') && 'slick-disabled'}`}
                        style={ getArrowstate('last') ? { pointerEvents:'none'} : {} }
                        type="button">
                        <span className="visually-hidden">
                            Previous
                        </span>
                    </button>
                )
            }
        </SliderContext.Provider>
    )
}
