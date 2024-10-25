/**
 * Dynamic Time Warping
 * 
 * This is a simple implementation of the Dynamic Time Warping algorithm.
 * The algorithm is used to compare two time series of arbitrary length.
 * 
 * Modified from the following source: https://github.com/GordonLesti/dynamic-time-warping/blob/master/src/dynamic-time-warping.js
 */
export class DynamicTimeWarping<T1, T2> {
    private distance: number | undefined;
    private matrix: number[][] | undefined;
    private path: [number, number][] | undefined;
    private ser1: T1[];
    private ser2: T2[];
    private distFunc: (arg0: T1, arg2: T2) => number;
    
    constructor( ts1: T1[], ts2: T2[], distanceFunction: (arg0: T1, arg2: T2) => number ) {
        this.ser1 = ts1;
        this.ser2 = ts2;
        this.distFunc = distanceFunction;
        this.distance = undefined;
        this.matrix = undefined;
        this.path = undefined;
    }

    getDistance() {
        if ( this.distance !== undefined ) {
            return this.distance;
        }
        this.matrix = [];
        for ( var i = 0; i < this.ser1.length; i++ ) {
            this.matrix[ i ] = [];
            for ( var j = 0; j < this.ser2.length; j++ ) {
                var cost = Infinity;
                if ( i > 0 ) {
                    cost = Math.min( cost, this.matrix[ i - 1 ][ j ] );
                    if ( j > 0 ) {
                        cost = Math.min( cost, this.matrix[ i - 1 ][ j - 1 ] );
                        cost = Math.min( cost, this.matrix[ i ][ j - 1 ] );
                    }
                } else {
                    if ( j > 0 ) {
                        cost = Math.min( cost, this.matrix[ i ][ j - 1 ] );
                    } else {
                        cost = 0;
                    }
                }
                this.matrix[ i ][ j ] = cost + this.distFunc( this.ser1[ i ], this.ser2[ j ] );
            }
        }

        return this.matrix[ this.ser1.length - 1 ][ this.ser2.length - 1 ];
    };


    getPath() {
        if ( this.path !== undefined ) {
            return this.path;
        }
        if ( this.matrix === undefined ) {
            this.getDistance();
        }
        const matrix = this.matrix!;
        var i = this.ser1.length - 1;
        var j = this.ser2.length - 1;
        this.path = [ [ i, j ] ];
        while ( i > 0 || j > 0 ) {
            if ( i > 0 ) {
                if ( j > 0 ) {
                    if ( matrix[ i - 1 ][ j ] < matrix[ i - 1 ][ j - 1 ] ) {
                        if ( matrix[ i - 1 ][ j ] < matrix[ i ][ j - 1 ] ) {
                            this.path.push( [ i - 1, j ] );
                            i--;
                        } else {
                            this.path.push( [ i, j - 1 ] );
                            j--;
                        }
                    } else {
                        if ( matrix[ i - 1 ][ j - 1 ] < matrix[ i ][ j - 1 ] ) {
                            this.path.push( [ i - 1, j - 1 ] );
                            i--;
                            j--;
                        } else {
                            this.path.push( [ i, j - 1 ] );
                            j--;
                        }
                    }
                } else {
                    this.path.push( [ i - 1, j ] );
                    i--;
                }
            } else {
                this.path.push( [ i, j - 1 ] );
                j--;
            }
        }
        this.path = this.path.reverse();

        return this.path;
    };
}