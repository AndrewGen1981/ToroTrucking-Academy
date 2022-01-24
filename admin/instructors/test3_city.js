const test3_city = [
    {
        title: 'Turns LEFT',
        items: [
            {
                item: 'Traffic Checks',
                checks: [ '1', '1', '1', '1' ]
            },
            {
                item: 'Signal',
                checks: [ '1', '1', '1', '1' ]
            },
            {
                item: 'Decelerates, coast',
                checks: [ '1', '1', '1', '1' ]
            },
            {
                item: 'Correct lane',
                checks: [ '1', '1', '1', '1' ]
            },
            {
                item: 'If Stop: Necessary',
                checks: [ '1', '1', '1', '1' ]
            },
            {
                item: 'If Stop: Smooth',
                checks: [ '1', '1', '1', '1' ]
            },
            {
                item: 'If Stop: Gap, Stop line',
                checks: [ '1', '1', '1', '1' ]
            },
            {
                item: 'If Stop: Roll back',
                checks: [ '1', '1', '1', '1' ]
            },
            {
                item: 'If Stop: Wheels straight',
                checks: [ '1', '1', '1', '1' ]
            },
            {
                item: 'Turning: Traffic checks',
                checks: [ '1', '1', '1', '1' ]
            },
        ]
    },  // end of block
    {
        title: 'Turns RIGHT',
        items: [
            {
                item: 'Traffic Checks',
                checks: [ '1', '1', '1', '1' ]
            },
            {
                item: 'Signal',
                checks: [ '1', '1', '1', '1' ]
            },
            {
                item: 'Decelerates, coast',
                checks: [ '1', '1', '1', '1' ]
            },
            {
                item: 'Correct lane',
                checks: [ '1', '1', '1', '1' ]
            },
            {
                item: 'If Stop: Necessary',
                checks: [ '1', '1', '1', '1' ]
            },
            {
                item: 'If Stop: Smooth',
                checks: [ '1', '1', '1', '1' ]
            },
            {
                item: 'If Stop: Gap, Stop line',
                checks: [ '1', '1', '1', '1' ]
            },
            {
                item: 'If Stop: Roll back',
                checks: [ '1', '1', '1', '1' ]
            },
            {
                item: 'If Stop: Wheels straight',
                checks: [ '1', '1', '1', '1' ]
            },
            {
                item: 'Turning: Traffic checks',
                checks: [ '1', '1', '1', '1' ]
            },
        ]
    },  // end of block
    {
        title: 'Intersections',
        items: [
            {
                item: 'Traffic checks',
                checks: [ 'Stoped', 'Stoped', 'Through', 'Through' ]
            },
            {
                item: 'Decel, coast',
                checks: [ 'Stoped', 'Stoped', 'Through', 'Through' ]
            },
            {
                item: 'Correct lane',
                checks: [ 'Stoped', 'Stoped', 'Through', 'Through' ]
            },
        ]
    },  // end of block
    {
        title: 'Intersections Stops',
        items: [
            {
                item: 'Smooth',
                checks: [ 'Stoped', 'Stoped']
            },
            {
                item: 'Gap, stop line',
                checks: [ 'Stoped', 'Stoped']
            },
            {
                item: 'Roll back',
                checks: [ 'Stoped', 'Stoped']
            },
        ]
    },  // end of block
    {
        title: 'Intersections Drive Through',
        items: [
            {
                item: 'Traffic checks',
                checks: [ 'Through', 'Through']
            },
            {
                item: 'Both hands',
                checks: [ 'Stoped', 'Stoped', 'Through', 'Through' ]
            },
            {
                item: 'Gears',
                checks: [ 'Stoped', 'Stoped', 'Through', 'Through' ]
            },
            {
                item: 'Yield',
                checks: [ 'Stoped', 'Stoped', 'Through', 'Through' ]
            },
            {
                item: 'Lane',
                checks: [ 'Stoped', 'Stoped', 'Through', 'Through' ]
            },
            {
                item: 'Outage',
                checks: [ 'Stoped', 'Stoped', 'Through', 'Through' ]
            },
        ]
    },  // end of block
    {
        title: 'Intersections Completion',
        items: [
            {
                item: 'Traffic Checks',
                checks: [ 'Stoped', 'Stoped', 'Through', 'Through' ]
            },
            {
                item: 'Maintains lane',
                checks: [ 'Stoped', 'Stoped', 'Through', 'Through' ]
            },
            {
                item: 'Accelerates',
                checks: [ 'Stoped', 'Stoped', 'Through', 'Through' ]
            },
        ]
    },  // end of block
    {
        title: 'Immediate DQ',
        items: [
            {
                item: 'Seatbelt Violation',
                checks: [ '1' ]
            },
            {
                item: 'Accident',
                checks: [ '1' ]
            },
            {
                item: 'Dangerous Action',
                checks: [ '1' ]
            },
            {
                item: 'Vehicle over curb or sidewalk',
                checks: [ '1' ]
            },
            {
                item: 'Violation of Law',
                checks: [ '1' ]
            },
            {
                item: 'Fails to Perform',
                checks: [ '1' ]
            },
        ]
    },  // end of block
    {
        title: 'RR Crossing APPROACH',
        items: [
            {
                item: 'Traffic & train checks',
                checks: [ 'STD', 'HAZ/Pass' ]
            },
            {
                item: '4-ways on HAZ/Pass',
                checks: [ 'HAZ/Pass' ]
            },
            {
                item: 'Decelerates, coast',
                checks: [ 'STD', 'HAZ/Pass' ]
            },
            {
                item: 'Right lane',
                checks: [ 'STD', 'HAZ/Pass' ]
            },
        ]
    },  // end of block
    {
        title: 'RR Crossing STOP',
        items: [
            {
                item: 'Stop 15-50 feet',
                checks: [ 'HAZ/Pass' ]
            },
            {
                item: 'Stop',
                checks: [ 'HAZ/Pass' ]
            },
            {
                item: 'Traffic & train checks',
                checks: [ 'HAZ/Pass' ]
            },
        ]
    },  // end of block
    {
        title: 'RR Crossing CROSSING',
        items: [
            {
                item: 'Gears',
                checks: [ 'STD', 'HAZ/Pass' ]
            },
            {
                item: 'Traffic & train checks',
                checks: [ 'STD', 'HAZ/Pass' ]
            },
            {
                item: 'Outage',
                checks: [ 'STD', 'HAZ/Pass' ]
            },
        ]
    },  // end of block
    {
        title: 'RR Crossing COMPLETION',
        items: [
            {
                item: '4-ways off (HAZ/Pass)',
                checks: [ 'HAZ/Pass' ]
            },
            {
                item: 'Accelerates',
                checks: [ 'STD', 'HAZ/Pass' ]
            },
        ]
    },  // end of block
    {
        title: 'Lane Changes',
        items: [
            {
                item: 'Traffic checks',
                checks: [ 'Left', 'Right', 'Left', 'Right' ]
            },
            {
                item: 'Signal',
                checks: [ 'Left', 'Right', 'Left', 'Right' ]
            },
            {
                item: 'Spacing',
                checks: [ 'Left', 'Right', 'Left', 'Right' ]
            },
            {
                item: 'Smooth Change',
                checks: [ 'Left', 'Right', 'Left', 'Right' ]
            },
            {
                item: 'Cancel Signal',
                checks: [ 'Left', 'Right', 'Left', 'Right' ]
            },
        ]
    },  // end of block
    {
        title: 'Curve',
        items: [
            {
                item: 'Speed/enter',
                checks: [ 'Left', 'Right' ]
            },
            {
                item: 'Speed/through',
                checks: [ 'Left', 'Right' ]
            },
            {
                item: 'Maintains lane',
                checks: [ 'Left', 'Right' ]
            },
            {
                item: 'Traffic checks',
                checks: [ 'Left', 'Right' ]
            },
        ]
    },  // end of block
    {
        title: 'Roadside Stop/Start APPROACH',
        items: [
            {
                item: 'Traffic checks',
                checks: [ '1' ]
            },
            {
                item: 'Signal on',
                checks: [ '1' ]
            },
            {
                item: 'Correct lane',
                checks: [ '1' ]
            },
            {
                item: 'Decelerates, coast',
                checks: [ '1' ]
            },
        ]
    },  // end of block
    {
        title: 'Roadside STOP',
        items: [
            {
                item: 'Position, curb',
                checks: [ '1' ]
            },
            {
                item: 'Not blocking traffic, hydrant',
                checks: [ '1' ]
            },
            {
                item: 'Roll back',
                checks: [ '1' ]
            },
            {
                item: 'Signal off, 4-way on',
                checks: [ '1' ]
            },
            {
                item: 'Set parking brake',
                checks: [ '1' ]
            },
        ]
    },  // end of block
    {
        title: 'Roadside RESUME',
        items: [
            {
                item: 'Traffic checks',
                checks: [ '1' ]
            },
            {
                item: '4-way off, signal on',
                checks: [ '1' ]
            },
            {
                item: 'Release parking brake',
                checks: [ '1' ]
            },
            {
                item: 'Roll back',
                checks: [ '1' ]
            },
            {
                item: 'Not stall engine',
                checks: [ '1' ]
            },
            {
                item: 'Accelerates',
                checks: [ '1' ]
            },
            {
                item: 'Cancel signal',
                checks: [ '1' ]
            },
        ]
    },  // end of block
    {
        title: 'Freeway',
        items: [
            {
                item: 'Merge On: Traffic checks',
                checks: [ '1' ]
            },
            {
                item: 'Merge On: Signal',
                checks: [ '1' ]
            },
            {
                item: 'Merge On: Merge',
                checks: [ '1' ]
            },
            {
                item: 'Merge On: Cancel signal',
                checks: [ '1' ]
            },
            {
                item: 'Driving: Traffic Checks',
                checks: [ '1' ]
            },
            {
                item: 'Driving: Maintains lane',
                checks: [ '1' ]
            },
            {
                item: 'Driving: Speed',
                checks: [ '1' ]
            },
            {
                item: 'Driving: Following distance',
                checks: [ '1' ]
            },
            {
                item: 'Exit: Traffic Checks',
                checks: [ '1' ]
            },
            {
                item: 'Exit: Signal',
                checks: [ '1' ]
            },
            {
                item: 'Exit: Merge, spacing',
                checks: [ '1' ]
            },
            {
                item: 'Exit: Decelerates/exit lane',
                checks: [ '1' ]
            },
            {
                item: 'Exit: Ramp speed',
                checks: [ '1' ]
            },
            {
                item: 'Exit: Cancel signal',
                checks: [ '1' ]
            },

        ]
    },  // end of block
    {
        title: 'General Driving',
        items: [
            {
                item: "Uses clutch improperly (shifting, double clutch, didn't ride)",
                checks: [ '1', '1', '1', '1', '1' ]
            },
            {
                item: 'Uses gears improperly (rev/lug engine, clash gears, coast)',
                checks: [ '1', '1', '1', '1', '1' ]
            },
            {
                item: 'Uses brakes improperly (smooth braking, no riding or pumping)',
                checks: [ '1', '1', '1', '1', '1' ]
            },
            {
                item: 'Improper steering (both hands, spokes)',
                checks: [ '1', '1', '1', '1', '1' ]
            },
            {
                item: 'Lane of travel (correct, over lanes, stop lines, gap, etc.)',
                checks: [ '1', '1', '1', '1', '1' ]
            },
            {
                item: 'Regular traffic checks',
                checks: [ '1', '1', '1', '1', '1' ]
            },
            {
                item: 'Improper use of turn signals',
                checks: [ '1', '1', '1', '1', '1' ]
            },

        ]
    },  // end of block
]


/*

    {
        title: 'Beginning Checks',
        items: [
            {
                item: 'Begin',
                checks: [  ]
            },
        ]
    },  // end of block

*/


module.exports = {
    test3_city
}