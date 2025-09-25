# sushi-restaurant-website

A modern and fully functional website for a sushi restaurant, featuring online ordering and delivery. This project was developed as a portfolio piece to showcase full-stack web development skills.


# Live Demo
https://sushi-restaurant-website-ay7f.onrender.com


## Project Goals
The primary goals of this project were to:
-   **Showcase Full-Stack Proficiency:** Demonstrate the ability to build a complete application from front-end to back-end using the MERN-like stack (MongoDB, Express, Node.js) with JavaScript.
-   **Implement Core E-Commerce Features:** Create a seamless user experience including authentication, a dynamic shopping cart, and order processing.
-   **Solve a Practical Problem:** Integrate a real-world API (OpenRouteService) to add valuable features like accurate delivery time and cost estimation.
-   **Ensure Accessibility & Responsiveness:** Build a fully responsive website that provides an excellent user experience on any device.


# Features
- Responsive design (desktop, tablet, mobile)
- User registration and login system
- Interactive Shopping Cart: Add, remove, and manage items with a real-time total price calculation.
- Order History: Full history of all user orders is saved and easily accessible.
- Saved Preferences: User addresses and payment methods are stored for faster checkout.
- Delivery Integration: Intelligent delivery time and cost calculation powered by the OpenRouteService API.


##  Tech Stack
*   **Frontend:** HTML, CSS,JavaScript
*   **Backend:** Node.js, Express
*   **Database:** MongoDB
*   **API:** OpenRouteService
*   **Deployment:** Render


## Screenshots
  
### Main Page
  > **Main Page** The homepage with a welcome banner and navigation, allowing the user to quickly access the menu and place an order.
  ![Main Page](/screenshots/home.page.png)

### Menu Page
  > **Interactive menu with filtering options.** Users can browse all categories of sushi, rolls, and other dishes. Each product card includes an image, description, price, and an "Add to Cart" button.
  ![Menu](/screenshots/menu.png)

### Shopping Cart
  > **Dynamic shopping cart.** Displays selected items, their quantity, and the total cost. Users can easily increase, decrease quantities, or remove items entirely. The cart updates in real-time.
  *User Registration*
  ![Cart](/screenshots/cart.png)

### User Registration
> **Simple registration form.** Allows new users to create an account to save their order history and address details for faster checkout. 
![Registration](/screenshots/signUp.png)

### Order History
> **User account with order history.** Registered users can view all their past and current orders, their status, and details. This feature enhances customer loyalty.
  ![History](/screenshots/account.png)
 
### Checkout Process
> **Multi-step checkout process.** Guides the user through selecting a delivery address (with cost calculation via API), payment method, and final order confirmation. The interface is intuitive and minimalistic.
  ![Checkout](/screenshots/checkout.png)


## Installation & Local Setup

Follow these steps to set up the project locally:

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/symbatisk/Sushi_Restaurant_Website.git
    cd sushi-restaurant-website
    ```

2.  **Set up the Backend:**
    ```bash
    cd backend
    npm install
    ```

3.  **Environment Variables:**
    Create a `.env` file in the `backend` directory and add the following:
    ```env
    MONGO_URI=your_mongodb_connection_string_here
    SESSION_SECRET=your_very_secret_key_here
    OPENROUTE_API_KEY=your_openrouteservice_api_key_here
    ```

4.  **Run the Backend Server:**
    Start the server from the `backend` directory:
    ```bash
    node server.js
    ```
  
5.  **Set up the Frontend (using Live Server in VS Code):**
    - Open the project root folder in **Visual Studio Code**.
    - Install the "Live Server" extension if you haven't already.
    - Right-click on the `index.html` file (or the main HTML file in your frontend directory) and select "Open with Live Server".


## Credits

Images from [Unsplash](https://unsplash.com/) and [Pexels](https://www.pexels.com/)


## License

This project is licensed under the MIT License – see the [LICENSE](LICENSE) file for details.
