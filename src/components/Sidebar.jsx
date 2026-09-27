import * as fabric from 'fabric';

const Sidebar = ({ fabricCanvas }) => {

    const addTitle = () => {
        if (!fabricCanvas) return;

        // Your personal, hardcoded font style
        const text = new fabric.Textbox('MAGAZINE TITLE', {
            left: 50,
            top: 50,
            width: 400,
            fontSize: 42,
            fontFamily: 'Helvetica', // Hardcoded font
            fontWeight: 'bold',
            fill: '#1a1a1a',         // Off-black color
            shadow: new fabric.Shadow({
                color: 'rgba(0,0,0,0.3)', // Beautiful drop shadow
                blur: 5,
                offsetX: 3,
                offsetY: 3
            })
        });

        fabricCanvas.add(text);
        fabricCanvas.setActiveObject(text);
        fabricCanvas.renderAll(); // Refresh canvas to show changes
    };

    return (
        <div className="w-64 bg-white border-r border-gray-200 p-6 flex flex-col shadow-lg z-10">
            <h2 className="text-xl font-black mb-6 text-gray-800">My Editor</h2>

            <button
                onClick={addTitle}
                className="w-full bg-black text-white font-semibold py-2 px-4 rounded-md hover:bg-gray-800 transition shadow-sm mb-4"
            >
                + Add Title
            </button>

            <div className="mt-auto text-xs text-gray-400">
                Phase 1: Local Setup
            </div>
        </div>
    );
};

export default Sidebar;