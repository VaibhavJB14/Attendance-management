let mockData = {
    students: {
        'Year 1': {
            'Sec A': [
                { rollNo: '101', name: 'Alex Johnson' },
                { rollNo: '102', name: 'Maria Garcia' },
                { rollNo: '103', name: 'James Smith' },
                { rollNo: '104', name: 'Emily Clark' },
                { rollNo: '105', name: 'Michael Brown' },
                { rollNo: '106', name: 'Samantha Davis' },
                { rollNo: '107', name: 'William Miller' },
                { rollNo: '108', name: 'Olivia Wilson' }
            ],
            'Sec B': [
                { rollNo: '121', name: 'Liam Moore' },
                { rollNo: '122', name: 'Sophia Taylor' },
                { rollNo: '123', name: 'Benjamin Anderson' },
                { rollNo: '124', name: 'Isabella Thomas' },
                { rollNo: '125', name: 'Lucas Jackson' }
            ],
            'Sec C': [
                { rollNo: '141', name: 'Mason White' },
                { rollNo: '142', name: 'Mia Harris' },
                { rollNo: '143', name: 'Ethan Martin' }
            ],
            'Sec D': [
                { rollNo: '161', name: 'Alexander Thompson' },
                { rollNo: '162', name: 'Charlotte Garcia' }
            ]
        },
        'Year 2': {
            'Sec A': [
                { rollNo: '201', name: 'Linda Martinez' },
                { rollNo: '202', name: 'David Lee' },
                { rollNo: '203', name: 'Sarah Connor' },
                { rollNo: '204', name: 'Daniel Rodriguez' }
            ],
            'Sec B': [
                { rollNo: '221', name: 'Matthew Lewis' },
                { rollNo: '222', name: 'Chloe Walker' },
                { rollNo: '223', name: 'Joseph Hall' }
            ],
            'Sec C': [
                { rollNo: '241', name: 'John Doe' },
                { rollNo: '242', name: 'Grace Allen' },
                { rollNo: '243', name: 'Samuel Young' }
            ],
            'Sec D': [
                { rollNo: '261', name: 'Jane Smith' },
                { rollNo: '262', name: 'Anthony King' },
                { rollNo: '263', name: 'Lily Wright' }
            ]
        }
    },
    sessions: [
        { id: 'morning', name: 'Morning Session', time: '08:00 AM - 10:00 AM' },
        { id: 'midday', name: 'Mid-Day Session', time: '11:00 AM - 01:00 PM' },
        { id: 'evening', name: 'Evening Session', time: '03:00 PM - 05:00 PM' }
    ],
    wardenSessions: [
        { id: 'morning-roll', name: 'Morning Roll Call', time: '06:30 AM' },
        { id: 'night-roll', name: 'Night Roll Call', time: '09:30 PM' }
    ],
    holidays: [
        { date: '2026-08-15', name: 'Independence Day', affectsHostel: true },
        { date: '2026-08-31', name: 'Demo Holiday', affectsHostel: false }, // Today's date for demo purposes
        { date: '2026-10-02', name: 'Gandhi Jayanti', affectsHostel: true },
        { date: '2026-12-25', name: 'Christmas', affectsHostel: true }
    ],
    rooms: {
        'Boys Hostel': [
            { id: 'B-101', name: 'Room 101' },
            { id: 'B-102', name: 'Room 102' },
            { id: 'B-103', name: 'Room 103' }
        ],
        'Girls Hostel': [
            { id: 'G-101', name: 'Room 101' },
            { id: 'G-102', name: 'Room 102' },
            { id: 'G-103', name: 'Room 103' }
        ]
    },
    wardenStudents: {
        'B-101': [
            { rollNo: '101', name: 'Alex Johnson' },
            { rollNo: '121', name: 'Liam Moore' }
        ],
        'B-102': [
            { rollNo: '141', name: 'Mason White' }
        ],
        'B-103': [],
        'G-101': [
            { rollNo: '201', name: 'Linda Martinez' },
            { rollNo: '202', name: 'David Lee' }
        ],
        'G-102': [],
        'G-103': []
    },
    users: [
        { username: 'admin', password: 'admin', role: 'admin', name: 'System Admin' },
        { username: 'teacher1', password: 'password', role: 'teacher', name: 'Mr. Smith', domain: 'Year 1 - Sec A' },
        { username: 'warden1', password: 'password', role: 'warden', name: 'Warden Patel', domain: 'Boys Hostel' }
    ]
};

const savedMockData = localStorage.getItem('erp_mockData');
if (savedMockData) {
    mockData = JSON.parse(savedMockData);
} else {
    localStorage.setItem('erp_mockData', JSON.stringify(mockData));
}

function saveMockData() {
    localStorage.setItem('erp_mockData', JSON.stringify(mockData));
}
